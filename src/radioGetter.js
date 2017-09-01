var axios = require('axios');
var fs = require('fs');
var ProgressBar = require('progress');
var audioconcat = require('audioconcat')

var addHours = require('date-fns/add_hours');
var getTime = require('date-fns/get_time');
var getDate = require('date-fns/get_date');
var getMonth = require('date-fns/get_month');
var getYear = require('date-fns/get_year')


const tempDir = "./temp";
const programDir = "./audio"


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


const getFiles = function( urls, destDir ) {
	
	/*
	if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
	console.log(`Downloading chunks`);
	var bar = new ProgressBar('[:bar] :current/:total :etas', { total: urls.length });

	urls.forEach( (url) => {
		const filename = url.split("/").pop();
		const pathToFile = `${destDir}/${filename}`;

		axios.get(url)
		.then( (response) => {
			fs.writeFile( pathToFile, response.data, (err) => {
				if (err) throw err;
				bar.tick();
			});
		})
		.catch( (e) => {
			console.log("Error url: ", url);
			throw new Error(e);
		})
	});
	*/
	

	if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
	const bar = new ProgressBar('[:bar] :current/:total :etas', { total: urls.length });
	const requestsArray = urls.map( (url) => axios.get(url).then( (response) => {
		bar.tick();
		return response;
	}) );

	return axios.all( requestsArray )
	.then( (responses) => {
		console.log("Saving files")
		const bar = new ProgressBar('[:bar] :current/:total :etas', { total: urls.length });
		return Promise.all( responses.map( (response) => {
			const filename = response.request.path.split("/").pop();
			const pathToFile = `${destDir}/${filename}`;
			return new Promise( function(resolve, reject) {
		            fs.writeFile( pathToFile, response.data,{ mode: 0o777 },  (err) => {
						if (err) reject(err);
						bar.tick();
						resolve(pathToFile);
					});
		    });
		}) )
	} )
	.catch( (e) => {
		throw new Error(e);
	})

}

const mergeChunks = function(chunkList, filename, destDir) {
	if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
	if ( filename.slice(-4) !== ".mp3" ) filename += ".mp3";
	audioconcat( chunkList )
		.concat(`${destDir}/${filename}`)
		.on('start', function (command) {
			console.log('ffmpeg process started:', command)
		})
		.on('error', function (err, stdout, stderr) {
			console.error('Error:', err)
			console.error('ffmpeg stderr:', stderr)
		})
		.on('end', function (output) {
			console.error('Audio created in:', output)
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

	return getChunksInfo( chunksTimestamp, radioChannel )
	.then( (datas) => {
		let count = 0;
		//Filter chunks not in true time interval
		const filtered =  datas.map( (data) => {
			const key = data.timestamp;
			const newChunks = data[key].chunks.filter( (c) => {
				count++;
				return c.start > secStart && c.start < secEnd;
			} );
			data[key].chunks = newChunks;
			return data;
		});
		console.log(`Got ${count} chunks`);
		return filtered;
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
		console.log(`Filtered to ${urls.length} chunks`);
		return getFiles(urls, tempDir);
	})
	/* .then( (logs) => {
		mergeChunks(logs, fileDest, programDir);
	}) */
	.catch( (e) => {
		console.log(e);
	})
}


getRadioProgram( {
	radioChannel: "metro951", 
	startHour: 9,
	endHour: 13,
	emissionDate: new Date(2017,7,30),
});

