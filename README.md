conga-bower
===========

Overview
--------

This is a bundle for the [Conga.js](https://github.com/congajs/conga) framework which 
wraps around [Bower](http://bower.io/) to easily configure and automatically install
client side packages during the application start up process.

Configuration
-------------

Example:

    // config.yml
    bower:

        # target directory in public where deps get installed
        directory: js/lib

        # dependencies to install
        dependencies:
            "backbone": "*"
            "bootstrap": "2.3.2"
            "underscore": "1.4.4"

Usage
-----

During application start up, this bundle will check if there were any dependencies added/changed
in the config. If so, they will be automatically installed by a spawned Bower process.
