const optionsRegex = /(--[a-zA-Z\-]+ '.*?')|(--[a-zA-Z\-]+)|(-[a-zA-Z\-]+? '.+?')|('?[a-z]+:\/\/.*?'+?)|("?[a-z]+:\/\/.*?"+?)/g; // eslint-disable-line
const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/; // eslint-disable-line

const contentTypeHeader = 'content-type';
const jsonMimeType = 'application/json';

const isMatchingOption = (headers, str) => {
	for (let i = 0; i < headers.length; i += 1) {
		if (str.startsWith(headers[i])) {
			return true;
		}
	}
	return false;
};

const isAHeaderOption = str => isMatchingOption(['-H ', '--headers '], str);
const isDataOption = str => isMatchingOption(['--data ', '--data-ascii ', '-d ', '--data-raw ', '--dta-urlencode ', '--data-binary '], str);

const removeLeadingTrailingQuotes = (str) => {
	const quotes = ['\'', '"'];
	const newStr = str.trim();
	return quotes.includes(newStr[0]) ? newStr.substr(1, newStr.length - 2) : newStr;
};

const subStrFrom = (val, startFromVal) => {
	const dataPosition = val.indexOf(startFromVal);
	return val.substr(dataPosition);
};

const isJsonRequest = parsedCommand => (parsedCommand.headers[contentTypeHeader] &&
	parsedCommand.headers[contentTypeHeader].indexOf(jsonMimeType) !== -1);

const parseBodyByContentType = ({ body, headers }) => {
	if (body && isJsonRequest(headers)) {
		try {
			const cleanedBodyData = body.replace('\\"', '"').replace("\\'", "'");
			return JSON.parse(cleanedBodyData);
		} catch (ex) {
			// ignore json conversion error..
			console.log('Cannot parse JSON Data ' + ex.message); // eslint-disable-line
		}
	}
	return body;
};

const parseOptionValue = (val) => {
	const headerSplit = subStrFrom(val, ' ').split(':');
	return {
		key: headerSplit[0].trim(),
		value: headerSplit[1].trim(),
	};
};

const parseQueryStrings = (url) => {
	const paramPosition = url.indexOf('?');
	const queryStrings = {};
	if (paramPosition !== -1) {
		// const splitUrl = parsedCommand.url.substr(0, paramPosition);
		const paramsString = url.substr(paramPosition + 1);
		const params = paramsString.split('&') || [];

		params.forEach((param) => {
			const splitParam = param.split('='); // eslint-disable-line
			queryStrings[splitParam[0]] = splitParam[1]; // eslint-disable-line
		});
	}
	return queryStrings;
};

const parseUrlOption = (val) => {
	const urlMatches = val.match(urlRegex) || [];
	if (urlMatches.length) {
		const url = urlMatches[0]; // eslint-disable-line
		return {
			url,
			queryStrings: parseQueryStrings(url),
		};
	}
	return { url: '', queryStrings: {} };
};

const parseBody = val => removeLeadingTrailingQuotes(subStrFrom(val, ' '));

const isACurlCommand = val => val.trim().startsWith('curl ');
const isAUrlOption = (val) => {
	const matches = val.match(urlRegex) || [];
	return !!matches.length;
};

/*
 * Parse cUrl command to a JSON structure
 * params:
 * command - cUrl command as a string.
 * return JSON object
*/
export function parse(command) {
	if (!command) { return ''; }

	const parsedCommand = {
		url: '',
	};

	// quit if the command does not starts with curl
	if (isACurlCommand(command)) {
		const matches = command.match(optionsRegex);
		console.log({ matches });

		matches.forEach((val) => {
			const option = removeLeadingTrailingQuotes(val);
			if (isAUrlOption(option)) {
				const { url, queryStrings } = parseUrlOption(option);
				parsedCommand.url = url;
				parsedCommand.queryStrings = queryStrings;
			} else if (isAHeaderOption(option)) {
				const { key, value } = parseOptionValue(option);
				parsedCommand.headers = parsedCommand.headers || {};
				parsedCommand.headers[key] = value;
			} else if (isDataOption(option)) {
				console.log("body", option);
				parsedCommand.body = parseBody(option);
			} else {
				// TODO : write for header
				console.log(`Skipped Header ${val}`); // eslint-disable-line
			}
		}); // parse over matches ends

		// should be checked after all the options are analyzed
		// so that we guarentee that we have content-type header
		parsedCommand.body = parseBodyByContentType(parsedCommand);
	}

	return parsedCommand;
}

export default parse;


//  const result = parsecurl(curlCmd);

const curlCmd = `curl 'https://exampleserver.com/api/v5/tracktime/' -H 'origin: https://exampleserver.com' -H 'accept-encoding: gzip, deflate, br' -H 'accept-language: en-GB,en-US;q=0.8,en;q=0.6' -H 'authorization: JWT eyJiOjE1MTIyMTIyNzYsIm9yaiOjE1MTIyMTIyNzYsIm9yaJ9.eyJ2ZXJzaW9uIjoiMjciLCJleHAiOjE1MTIyMTIyNzYsIm9yaiOjE1MTIyMTIyNzYsIm9yaLCJ1c2VyX2lkIjo1MTAsImVtYWlsIjoibWFydWRodS5ndW5iOjE1MTIyMTIyNzYsIm9yam5hbWUiOiJtYXJ1ZGh1Lmd1iOjE1MTIyMTIyNzYiOjE1MTIyMTIyNzYsIm9yafQ._BuiOjE1MTIyMTIyNzYsIm9yadJ__2iOjE1MTIyMTIyNzYsIm9yaRTmNcW0' -H 'content-type: application/json; charset=UTF-8' -H 'accept: */*' -H 'referer: https://exampleserver.com/timeSheetChange' -H 'authority: exampleserver.com' -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36' --data-binary '{"action":"Add custom time","data":"November 27, 2017 - December 03, 2017"}' --compressed`;

const curlRequest = `curl --location --request GET 'https://hy-staging.1spoc.ai/?param1=paramsValue1' \
--header 'header1: headerValue1' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer Beare  Token' \
--data '{
    "key1": "value1",
    "key2": "value2" 
}'`;


console.log();

console.log(parse(curlCmd));
