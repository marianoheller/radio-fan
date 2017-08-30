var axios = require('axios');
var fs = require('fs');
var ProgressBar = require('progress');
var addHours = require('date-fns/add_hours');
var getTime = require('date-fns/get_time');
var getDate = require('date-fns/get_date');
var getMonth = require('date-fns/get_month');
var getYear = require('date-fns/get_year')


const tempDir = "./temp";
const targetDate = "150409";
const radioChannel = "metro951";


const getChunksInfo = function( timestamp, radioChannel ) {
	const chunkServerUrl = `https://chunkserver.radiocut.fm/server/get_chunks`;
	const requestsArray = [];
	timestamp.forEach( (t) => {
		const targetUrl = `${chunkServerUrl}/${radioChannel}/${t}/`;
		requestsArray.push( axios.get(targetUrl) );
	});

	return axios.all(requestsArray)
	.then( (response) => {
		return response.map( (r) => {
			const key = timestamp.map(String)
						.find( (t) => Object.keys(r.data).includes(t) );
			return Object.assign( r.data, { timestamp: key } );
		});
	} )
	.catch( (e) => {
		throw new Error(e);
	})
}

const getChunk = function( filename, baseUrl, destDir ) {
	const targetURL = `${baseUrl}/${filename}`;

	axios.get( targetURL )
	.then( (response) => {

		const pathToFile = `${destDir}/${filename}`;
		if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);

		fs.writeFile( pathToFile, response.data, (err) => {
			if (err) throw err;
		});
	} )
	.catch( (e) => {
		throw new Error(e);
	})
}

const getFiles = function( urls, destDir ) {
	const requestsArray = urls.map( (url) => axios.get(url) );

	axios.all( requestsArray )
	.then( (responses) => {
		if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
		console.log(responses);
	}) 
	.catch( (e) => {
		throw new Error(e);
	})
}




const getRadioProgram = function( { radioChannel, startHour, endHour, emissionDate, fileDest } ) {
	if ( !emissionDate ) emissionDate = new Date();
	if ( !fileDest ) fileDest = `${radioChannel}_${getYear(emissionDate)}${getMonth(emissionDate)}${getDate(emissionDate)}`;
	if ( endHour < startHour ) throw  new Error("Start hour should be lowers than end hour");
	emissionDate.setHours(0, 0, 0, 0);
	const startDate = addHours(emissionDate, startHour);
	const endDate = addHours(emissionDate, endHour);

	const secStart = getTime(startDate)/1000;
	const secEnd = getTime(endDate)/1000;

	const chunksTimestamp = [];
	for( let i = Math.floor(secStart/10000) ; i <= Math.floor(secEnd/10000) ; i++ ) {
		chunksTimestamp.push(i);
	}

	getChunksInfo( chunksTimestamp, radioChannel )
	.then( (datas) => {
		//Filter chunks not in true time interval
		return datas.map( (data) => {
			const key = data.timestamp;
			const newChunks = data[key].chunks.filter( (c) => c.start > secStart && c.start < secEnd );
			data[key].chunks = newChunks;
			return data;
		});
	})
	.then( (datas) => {
		//Parse file urls to array
		return datas.reduce( (acc, data) => {
			const key = data.timestamp;
			const { baseURL } = data[key];
			return acc.concat(
				data[key].chunks.map( (c) => `${baseURL}/${c.filename}`)
			);
		}, [] );
	})
	.then( (urls) => {
		getFiles(urls, tempDir);
	})
	.catch( (e) => {
		console.log(e);
	})
}


getRadioProgram( {
	radioChannel: radioChannel, 
	startHour: 9,
	endHour: 13,
	emissionDate: new Date(),
});

