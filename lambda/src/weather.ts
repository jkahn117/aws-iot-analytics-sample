import axios from 'axios'
import * as moment from 'moment'
import * as SSM from 'aws-sdk/clients/ssm'
import * as DynamoDB from 'aws-sdk/clients/dynamodb'

export interface WeatherConditions {
  temp_f:number
  temp_c:number
  humdity:number
  pressure:number
}

interface WeatherResult {
  success:Boolean
  error?:Error
  weather?:WeatherConditions  
}

export class Weather {
  private apiKey:string
  private ssm:SSM
  private ddb:DynamoDB.DocumentClient

  /**
   * Retrieves the weather service API key stored in AWS Systems Manager Parameter Store.
   */
  private async getApiKey():Promise<string> {
    if (!this.ssm) { this.ssm = new SSM() }

    const params:SSM.Types.GetParameterRequest = {
      Name: process.env.API_KEY_PARAMETER_NAME as string,
      WithDecryption: true
    }

    let result:SSM.GetParameterResult = await this.ssm.getParameter(params).promise()
    if (result && result.Parameter) {
      return result.Parameter.Value as string
    } else {
      throw Error(`API Key not found in SSM (${process.env.API_KEY_PARAMETER_NAME})`)
    }
  }

  private roundTo(number:number, precision=2):number {
    let factor = Math.pow(10, precision)
    return Math.round(number * factor) / factor
  }

  private kelvinToFahrenheit(temp:number):number {
    return this.roundTo(9 / 5 * (temp - 273) + 32)
  }

  private kelvinToCelsius(temp:number):number {
    return this.roundTo(temp - 273)
  }

  /**
   * Retrieves the current weather conditions from the weather service for
   * the provided zip code.
   * @param zipCode 
   */
  private async getWeatherFromService(zipCode:number):Promise<WeatherResult> {
    if (!this.apiKey) { this.apiKey = await this.getApiKey() }

    const url = `https://api.openweathermap.org/data/2.5/weather?zip=${zipCode},us&appid=${this.apiKey}`

    try {
      const response = await axios.get(url)
      const data = response.data.main
      return {
        success: true,
        weather: {
          temp_f: this.kelvinToFahrenheit(data.temp),
          temp_c: this.kelvinToCelsius(data.temp),
          humdity: data.humidity,
          pressure: data.pressure
        }
      }
    } catch (error) {
      return { success: false, error: error }
    }
  }

  /**
   * 
   * @param zipCode 
   */
  private async getWeatherFromCache(zipCode:number):Promise<WeatherResult> {
    if (!this.ddb) { this.ddb = new DynamoDB.DocumentClient() }

    let params:DynamoDB.DocumentClient.QueryInput = {
      TableName: process.env.WEATHER_TABLE as string,
      KeyConditionExpression: 'zipCode = :zip and cacheTimestamp BETWEEN :from and :to',
      ExpressionAttributeValues: {
        ':zip': zipCode,
        ':from': Number(moment().subtract(15, 'minutes').format('X')),
        ':to': Number(moment().format('X'))
      }
    }

    try {
      const result:DynamoDB.DocumentClient.QueryOutput = await this.ddb.query(params).promise()
      if (result && result.Items && result.Items.length > 0) {
        return {
          success: true,
          weather: result.Items[0].weather as WeatherConditions
        }
      } else {
        return { success: false }
      }
    } catch (error) {
      return { success: false, error: error }
    }
  }

  /**
   * 
   * @param zipCode 
   */
  private async putWeatherInCache(zipCode:number, weather:WeatherConditions) {
    if (!this.ddb) { this.ddb = new DynamoDB.DocumentClient }

    const params:DynamoDB.DocumentClient.PutItemInput = {
      TableName: process.env.WEATHER_TABLE as string,
      Item: {
        zipCode: zipCode,
        cacheTimestamp: Number(moment().format('X')),
        weather: weather
      }
    }

    return await this.ddb.put(params).promise()
  }

  /**
   * 
   * @param zipCode 
   */
  async forZip(zipCode:number) {
    try {
      let result = await this.getWeatherFromCache(zipCode)
      if (result.success) {
        console.log('Cache hit')
        return result.weather
      } else {
        result = await this.getWeatherFromService(zipCode)
        if (result.success) {
          await this.putWeatherInCache(zipCode, result.weather as WeatherConditions)
          return result.weather
        }
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }
}
