const https = require('https');
const fetch = require('node-fetch').default;
const streamBuffers = require('stream-buffers');
const m3u8Parser = require('m3u8-parser');

const BLOCKS_SIZES = 25;

// Parts Content-Type: video/MP2T
function _downloadPart(partUrl) {
	return new Promise((resolve, reject) => {
		const data = [];
		https.get(partUrl, response => {
			response.on('end', () => resolve(data));
			response.on('error', reject);
			response.on('data', chunk => data.push(chunk));
		});
	});
}

function downloadBlock(urls) {
	return Promise.all(urls.map(url => _downloadPart(url)))
		.then((parts) => parts.reduce((prev, chunk) => [...prev, ...chunk], []));
}

async function download(parts) {
	const blocks = [];
	const _parts = [...parts];
	const destinationStream = new streamBuffers.WritableStreamBuffer();
	let index = 1;

	while (_parts.length) {
		blocks.push(_parts.splice(0, BLOCKS_SIZES));
	}

	for (let block of blocks) {
		console.log(`Downloading block ${index++} of ${blocks.length}`);
		const blockData = await downloadBlock(block);
		blockData.forEach(block => destinationStream.write(block));
	}
	console.log('All clocks downlaoded!');

	destinationStream.end();
	return destinationStream;
}

function parse(rawText) {
	const parser = new m3u8Parser.Parser();
	parser.push(rawText);
	parser.end();
	return parser.manifest;
}

async function requestM3u8(url) {
	const response = await fetch(url);
	const raw = await response.text();
	return parse(raw);
}

async function execute(url) {
	const t0 = Date.now();
	const indexData = await requestM3u8(url);
	const t1 = Date.now();
	const listIndexUrl = indexData.playlists[0].uri;
	const listIndex = await requestM3u8(listIndexUrl);
	const t2 = Date.now();
	const downloadUrls = listIndex.segments.map(listItem => listItem.uri);

	console.log('Downloading file...');
	const contentStream = await download(downloadUrls);
	const t3 = Date.now();
	console.log('Timetable:', {
		'requestMainFile': t1 - t0,
		'requestIndexFile': t2 - t1,
		'downloadFile': t3 - t2,
		'totalTime': t3 - t1
	});

	return contentStream.getContents();
}

exports.handler = async event => {
	const url = event.queryStringParameters.url || '';

	if (!url) {
		return {
			statusCode: 412,
			body: 'You must provide an "url" param in the query string'
		};
	}

	try {
		new URL(url);
	} catch {
		console.error(error);
		return {
			statusCode: 412,
			body: 'Provided "url" is not a valid URL: ' + url
		};
	}
	
	try {
		const contents = await execute(url);
		
		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'video/MP2T'
			},
			body: contents
		};
	} catch (error) {
		console.log(error);
		return {
			statusCode: 500,
			body: error.message
		};
	}
};
