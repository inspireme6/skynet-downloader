const fs = require('fs');
const url = require('url');
const path = require('path');
const Crawler = require('simplecrawler');

function secondsToDays(seconds) {
	seconds = Number(seconds);
	var d = Math.floor(seconds / (3600*24));
	var h = Math.floor(seconds % (3600*24) / 3600);
	var m = Math.floor(seconds % 3600 / 60);
	var s = Math.floor(seconds % 60);

	var dDisplay = d > 0 ? d + (d == 1 ? 'd ' : 'd ') : '';
	var hDisplay = h > 0 ? h + (h == 1 ? 'h ' : 'h ') : '';
	var mDisplay = m > 0 ? m + (m == 1 ? 'm ' : 'm ') : '';
	var sDisplay = s > 0 ? s + (s == 1 ? 's' : 's') : '';
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

function fixURL(url){
	var tmp = url;
	if (!/^((?:f|ht)tps?:)?\/\//.test(url)){
		tmp = 'https://' + tmp;
	}
	if (!tmp.endsWith('/')){
		tmp = tmp + '/';
	}
	return tmp;
}

function download(skylink, portalurl, maxdepth) {

	const fullURL = new URL(portalurl + skylink);
    const crawler = new Crawler(fullURL.href);
	const domain = fullURL.hostname;
	var startTime;

	crawler.addFetchCondition(function(queueItem) {
		// crawler for some reason sometimes fetch the index page from the portal site
		// adding this condition we avoid this behaviour.
		return (queueItem.path != '/index.html');
	});
	crawler.on('crawlstart', function () {
		crawler.interval = 500;
		crawler.maxConcurrency = 5;
		crawler.maxDepth = maxdepth;
		startTime = (new Date).getTime() / 1000;
		console.log('\n-> Downloading:', skylink, 'and assets');
		console.log('-> Portal:', portalurl, '\n');
	});
    crawler.on('fetchcomplete', function(queueItem, responseBuffer, response) {
        const slurl = new URL(queueItem.url);
        const outputdir = path.join(__dirname, domain, skylink);
        const dirname = path.join(outputdir, slurl.pathname.replace(/\/[^/]+$/, ''));
        const filepath = path.join(outputdir, slurl.pathname);

        fs.exists(dirname, function(exists) {
            if (exists) {
                fs.writeFile(filepath, responseBuffer, function() {});
            } else {
                fs.mkdir(dirname, { recursive: true, mode: 0755 }, function() {
                    fs.writeFile(filepath, responseBuffer, function() {});
                });
            }
        });
        console.log('Downloaded: %s (%d bytes)', slurl.pathname, responseBuffer.length);
    });
    crawler.on('complete', function() {
		const endTime = (new Date).getTime() / 1000;
		console.log('\nCompleted in:', secondsToDays(endTime - startTime));
    });
	crawler.start();
};

var portalURL = 'https://siasky.net/',
	depth = 2;

var argv = require('yargs')
	.usage('Usage: $0 <skylink> [options]')
	.command('-p <portal-url>', 'Use a different portal, default = siasky.net')
	.command('-d <max-depth>', 'Choose max search depth (how deep it will look for files), default = 2')
	.demandCommand(1, '')
	.argv;

if (argv._.length > 0){
	if (argv._[0].length !== 46) {
		console.log('Invalid skylink.');
		process.exit(1);
	}

	if (typeof argv.p === 'string'){
		portalURL = fixURL(argv.p);
	}

	if (typeof argv.d === 'number'){
		depth = argv.d;
	}
	
	download(argv._[0], portalURL, depth);
}