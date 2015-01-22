/*
 * This file is part of the conga-bower module.
 *
 * (c) Marc Roulias <marc@lampjunkie.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// built-in modules
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

/**
 * Bower configures and runs Bower within the current application
 * during the kernel boot process.
 *
 * It checks if there are any new dependencies to install and if so,
 * spawns a process to run Bower in the application's public directory.
 * 
 */
function Bower() { }

Bower.prototype = {
	
	/**
	 * Run bower in the application if dependencies are defined
	 * and haven't been installed
	 * 
	 * @param {Object} event
	 * @param {Function} next
	 */
	onServerBoot: function(event, next){

		var container = event.container;

		this.createPublicDirectory(container);
		this.createBowerJson(container);
		this.createBowerConfig(container);

		try {

			if (!this.compareChecksum(container)){
				this.runBower(container, function(){
					next();
				});

			} else {
				container.get('logger').info('Bower: nothing to install');
				next();
			}

		} catch (err){
			console.log(err);
			process.exit();
		}
	},

	/**
	 * Spawn a child process to run bower in the application public path
	 *
	 * @todo - maybe some day the bower api will allow us to do this directly
	 *         without having spawn a process
	 *
	 * @param {Container} container
	 * @param {Function} next
	 */
	runBower: function(container, next){

		container.get('logger').info('Bower: Installing dependencies');

		var self = this;
		var config = container.get('config').get('bower');
		var dir = container.getParameter('kernel.app_public_path');
		var command = path.join(__dirname, '../node_modules/bower/bin/bower');

		var args = ['update'];
		if (typeof config.allowRoot !== 'undefined' && !!config.allowRoot) {
			args.push('--allow-root');
		}
		var cmd = spawn(command, args, { cwd : dir });

		cmd.stdout.on('data', function(data){
			container.get('logger').info('' + data);
		});

		cmd.stderr.on('data', function(data){
			container.get('logger').info('' + data);
		});

		cmd.on('close', function(data){
			self.cleanupBowerFiles(container);
			container.get('logger').info('Bower: Done installing dependencies');
			next();
		});
	},

	/**
	 * Create the target directory if it doesn't exist
	 * 
	 * @param  {Container} container
	 * @return {void}
	 */
	createPublicDirectory: function(container){

		var dir = container.get('config').get('bower').directory;

		if (typeof dir !== 'undefined' && dir !== '' && dir !== '/'){

			dir = path.join(container.getParameter('kernel.app_public_path'), dir);

			if (!fs.existsSync(dir)){

				container.get('wrench').mkdirSyncRecursive(dir);
			}
		}
	},

	/**
	 * Create the bower.json file in the public path
	 *
	 * @param {Container} container
	 */
	createBowerJson: function(container){
		var target = path.join(container.getParameter('kernel.app_public_path'), 'bower.json');
		var config = container.get('config').get('bower');

		var json = JSON.stringify(
			{
				name: 'bower-test',
				version: '0.0.0',
				dependencies: config.dependencies
			}, null, 4);

		fs.writeFileSync(target, json);
	},

	/**
	 * Create the .bowerrc file in the public path
	 *
	 * @param {Container}
	 */
	createBowerConfig: function(container){
		var target = path.join(container.getParameter('kernel.app_public_path'), '.bowerrc');
		var config = container.get('config').get('bower');
		var json = JSON.stringify(
			{
				directory: config.directory,
				json: 'bower.json'
			}, null, 4);

		fs.writeFileSync(target, json);
	},

	/**
	 * Cleanup the temporary bower files in the public directory
	 * 
	 * @param  {Container} container
	 */
	cleanupBowerFiles: function(container){
		fs.unlinkSync(path.join(container.getParameter('kernel.app_public_path'), '.bowerrc'));
		fs.unlinkSync(path.join(container.getParameter('kernel.app_public_path'), 'bower.json'));
	},

	/**
	 * Compare checksum if one already exists, otherwise create cachec checksum file
	 *
	 * Returns true if checksums match
	 *
	 * @returns {Boolean}
	 */
	compareChecksum: function(container){
		var checksumPath = path.join(container.getParameter('kernel.app_cache_path'), '.bower-checksum');
		var config = container.get('config').get('bower');
		var checksum = this.generateChecksum(config);

		if (fs.existsSync(checksumPath)){
			if (fs.readFileSync(checksumPath).toString() == checksum){
				return true;
			} else {
				this.writeChecksum(checksumPath, checksum);
				return false;
			}
		}

		this.writeChecksum(checksumPath, checksum);

		return false;
	},

	/**
	 * Generate the checksum string from the bower config object
	 *
	 * @returns {String}
	 */
	generateChecksum: function(config){

		var deps = [];

		for (var i in config.dependencies){
			deps.push(i + '-' + config.dependencies[i]);
		}

		// sort dependencies so that they are always in the same order
		deps.sort();

		// build hash of all possible settings that could change
		var data = {
			directory: config.directory,
			deps: deps
		};

		var checksum = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
		return checksum;
	},

	/**
	 * Write out the checksum cache file
	 *
	 * @returns {void}
	 */
	writeChecksum: function(checksumPath, checksum){
		fs.writeFileSync(checksumPath, checksum);
	}
};

Bower.prototype.constructor = Bower;

module.exports = Bower;