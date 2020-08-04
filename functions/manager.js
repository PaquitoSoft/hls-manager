exports.handler = async event => {
	const url = event.queryStringParameters.hlsUrl || '';
	return {
		statusCode: 200,
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ url })
	};
};
