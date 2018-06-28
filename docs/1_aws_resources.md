# AWS IoT Analytics Sample

## Part 1: Deploying AWS Resources

Deployment of this project requires a number of steps as well as manual configuration of your Raspberry Pi and aspects of AWS IoT. Where possible, I have tried to leverage automation, but detailed instructions are provided for manual steps.

** INSERT ARCHITECTURE DIAGRAM **

One of the core aspects of AWS IoT Analytics is that it allows you to modify or enrich incoming IoT data. Here, we use [AWS Lambda](https://aws.amazon.com/lambda/) to retrieve weather data from [OpenWeatherMap](https://openweathermap.org/).

A [Makefile](./Makefile) is provided to assist in deployment of our Lambda function and other AWS resources, we'll make use of it throughout setup:

First, you will need to create a new OpenWeatherMap account and collect your API Key: [OpenWeatherMap Sign Up](https://home.openweathermap.org/users/sign_up). Grab your key and enter the following:

``` bash
$ make API-KEY=XXXXXXX set-openweather-api-key
```

This will create a new `SecureString` in the [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-paramstore.html) to securely house your API key. Our Lambda function will have permission to retrieve the string.

Next, let's create a new Amazon S3 bucket to house our deployment resources. You can either modify the Makefile in your favorite text editor or pass an argument to set a unique bucket name:

``` bash
$ make create-bucket

OR

$ make AWS_BUCKET_NAME=mybucketname create-bucket
```

Once complete, we can package and deploy our Lambda function and the other AWS resources required for this project:

``` bash
$ make deploy
```

*Note:* The included Lambda function is written in [TypeScript](https://www.typescriptlang.org/) utilizing a few ideas I was toying with at the time. The `deploy` task will take care of compiling to JavaScript, packing, etc.

Deploying the AWS resources will take a few minutes. Once finished, you can view outputs to capture the name of the newly deployed Lambda function:

``` bash
$ make outputs
```

[Next: Configuring AWS IoT Core](2_iot_core.md)