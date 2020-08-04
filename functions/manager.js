exports.handler = async event => {
	const url = event.queryStringParameters.hlsUrl || '';
	return {
		statusCode: 200,
		body: url
	};
};
