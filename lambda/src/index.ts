import { Handler } from 'aws-lambda'
import { Weather, WeatherConditions } from './weather'
import * as moment from 'moment'
import * as util from 'util'

interface EventInput {
  timestamp:string
  temp:any
  pressure:number
  humidity:number
  accelerometer:any
  zipCode:number
  env?:WeatherConditions
}

interface Result {
  _datetime:string
  humidity:number
  pressure:number
  temp_f:number
  timestamp:number
  zipCode:number
  env?:WeatherConditions
}

const weather = new Weather()

/**
 * Process the incoming record from AWS IoT Analytics and append weather
 * data.
 * 
 * @param record 
 */
async function processRecord(record:EventInput):Promise<Result> {
  let result:Result = {
    _datetime: moment(record.timestamp, 'X').format('DD/MM/YYYY HH:mm:ss'),
    humidity: record.humidity,
    pressure: record.humidity,
    temp_f: record.temp.temp_f,
    timestamp: Number(record.timestamp),
    zipCode: record.zipCode
  }

  if (record && record.zipCode) {
    let weatherConditions = await weather.forZip(record.zipCode)
    result.env = weatherConditions
  }

  console.log(util.inspect(result, { depth: 5 }))
  return Promise.resolve(result)
}


/**
 * Main handler function, strolls through records delivered by AWS IoT Analytics.
 * 
 * @param event 
 */
const handler:Handler = async (event:[EventInput]) => {
  let output:Array<Result> = []
  for (let record of event) {
    output.push(await processRecord(record))
  }

  return output
}

export { handler }
