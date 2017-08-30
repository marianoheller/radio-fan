var axios = require('axios');
var fs = require('fs');
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
	const targetUrl = `${chunkServerUrl}/${radioChannel}/${timestamp}/`;

	console.log(`Getting chunks from: ${targetUrl}`);
	return axios.get(targetUrl)
	.then( (response) => {
		console.log(`Got ${response.data[timestamp].chunks.length} chunks`);
		return response.data;
	} )
	.catch( (e) => {
		throw new Error(e);
	})
}

const getChunk = function( filename, baseUrl, destDir ) {
	const targetURL = `${baseUrl}/${filename}`;

	console.log(`Getting audio file: ${filename}`);
	console.log(`Target url: ${targetURL}`)

	axios.get( targetURL )
	.then( (response) => {

		const pathToFile = `${destDir}/${filename}`;
		if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);

		fs.writeFile( pathToFile, response.data, (err) => {
			if (err) throw err;
			console.log(`Saved file ${pathToFile} successfully`);
		});
	} )
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

	console.log(secStart, secEnd);
}


getRadioProgram( {
	radioChannel: radioChannel, 
	startHour: 9,
	endHour: 13,
	emissionDate: new Date(),
});


/*
getChunksInfo(targetDate, radioChannel)
.then( (data) => {
	const { baseURL } = data[targetDate];
	getChunk( data[targetDate].chunks[0].filename, baseURL, tempDir);
} )
.catch( (e) => {
	console.log(e);
})

*/