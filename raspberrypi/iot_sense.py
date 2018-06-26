from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
from sense_hat import SenseHat
from datetime import datetime
import os
import configparser
import time
import json

config = configparser.ConfigParser()
config.read('config.ini')

sense = SenseHat()
sense.clear()

## SenseHat
def get_device_id():
  # Extract serial from cpuinfo file
  cpu_serial = "0000000000000000"
  try:
    f = open('/proc/cpuinfo','r')
    for line in f:
      if line[0:6]=='Serial':
        cpu_serial = line[10:26]
    f.close()
  except:
    cpu_serial = "ERROR000000000"
 
  return cpu_serial

def get_humidity():
    return sense.get_humidity()

def get_cpu_temperature():
    temp = os.popen("vcgencmd measure_temp").readline()
    return float(temp[temp.index('=')+1:temp.rindex("'")])

def convert_to_fahrenheit(temp_c):
    return float(temp_c) * 9.0 / 5.0 + 32.0

def convert_celsius(temp_f):
    return (float(temp_f) - 32.0) * 5.0 / 9.0

def get_temperature():
    """Capture temperature from SenseHat, correcting for
    Pi temperature. The Pi CPU itself generates heat, causing
    the SenseHat to read a higher temperature, we try to correct
    here as shown at https://github.com/initialstate/wunderground-sensehat/wiki/Part-3.-Sense-HAT-Temperature-Correction.
    """
    temp_f = convert_to_fahrenheit(sense.get_temperature())
    cpu_temp_f = convert_to_fahrenheit(get_cpu_temperature())

    temp_f_calibrated = temp_f - ((cpu_temp_f - temp_f) / 1.4201)
    return {
        'temp_f': float("{0:.2f}".format(temp_f_calibrated)),
        'temp_c': float("{0:.2f}".format(convert_celsius(temp_f_calibrated)))
    }

def get_pressure():
    return sense.get_pressure()

def get_accelerometer():
    return sense.get_accelerometer()


# unique identifier and topic for the device
sensor_id = get_device_id()
topic = config['DEFAULT']['TOPIC_PREFIX'] + '/' + sensor_id

## initialize the IoT MQTT Client
client = AWSIoTMQTTClient(sensor_id)
client.configureEndpoint(config['DEFAULT']['ENDPOINT'], 8883)
client.configureCredentials(config['DEFAULT']['ROOT_CA'], config['DEFAULT']['PRIVATE_KEY'], config['DEFAULT']['CERTIFICATE'])
client.configureAutoReconnectBackoffTime(1, 32, 20)
client.configureOfflinePublishQueueing(-1) # infinite offline publishing
client.configureDrainingFrequency(2) # 2 Hz
client.configureConnectDisconnectTimeout(10) # 10 seconds
client.configureMQTTOperationTimeout(5) # 5 seconds

## initate the connection to AWS IoT endpoint
client.connect()

print("Topic: {}".format(topic))

## continue sending data to AWS IoT until stopped
while True:
    payload = {}
    payload['zipCode'] = int(config['DEFAULT']['ZIPCODE'])
    payload['accelerometer'] = get_accelerometer()
    payload['humidity'] = get_humidity()
    payload['temp'] = get_temperature()
    payload['pressure'] = get_pressure()
    payload['timestamp'] = datetime.utcnow().strftime("%s")

    print(payload)

    client.publish(topic, json.dumps(payload), 1)
    time.sleep(120)

client.disconnect()
