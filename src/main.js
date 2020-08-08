const Hapi = require('@hapi/hapi');
const Boom = require('@hapi/boom');
const hlsDownloader = require('./services/hls-downloader');

const PORT = process.env.PORT || 4040;

const init = async () => {
	const server = Hapi.server({
		port: PORT
	});

	server.route({
		method: 'GET',
		path: '/hls-file',
		handler: async (request, helpers) => {
			console.log({ query: request.query });

			if (!request.query.url) {
				throw Boom.badRequest('"url" querystring param is required');
			}

			try {
				new URL(request.query.url);
			} catch (error) {
				console.error(error);
				throw Boom.badRequest('Invalid "url" querystring param: ' + request.query.url);
			}

			try {
				const fileContents = await hlsDownloader.downloadFromHlsUrl(request.query.url);
				const response = helpers.response(fileContents);
				response.type('video/MP2T');
				return response;
			} catch (error) {
				console.error('Error fetching file from HLS:', error.message);
				console.error(error.stack);
				throw Boom.badImplementation('Could not complete the operation.');
			}

		}
	});

	await server.start();
	console.log('Server nunning on:', server.info.uri);
}

process.on('unhandledRejection', (error) => {
	console.log(error);
	process.exit(1);
});

init();
