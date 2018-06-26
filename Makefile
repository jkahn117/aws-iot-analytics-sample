AWS_BUCKET_NAME ?= aws-iot-analytics-sample
AWS_STACK_NAME ?= aws-iot-analytics-sample
AWS_REGION ?= us-east-2

SAM_TEMPLATE = template.yaml
SAM_PACKAGED_TEMPLATE = packaged.yaml

create-bucket:
	@ aws s3api create-bucket \
	      --bucket $(AWS_BUCKET_NAME) \
	      --region $(AWS_REGION) \
	      --create-bucket-configuration LocationConstraint=$(AWS_REGION)

setup:
	@ cd lambda && npm install
	@ cd ..

package:
	@ cd lambda && npm run build
	@ cd ..
	@ aws cloudformation package \
	      --template-file $(SAM_TEMPLATE) \
	      --s3-bucket $(AWS_BUCKET_NAME) \
	      --region $(AWS_REGION) \
	      --output-template-file $(SAM_PACKAGED_TEMPLATE)

deploy:
	@ make package
	@ aws cloudformation deploy \
	      --template-file $(SAM_PACKAGED_TEMPLATE) \
	      --region $(AWS_REGION) \
	      --capabilities CAPABILITY_NAMED_IAM \
	      --stack-name $(AWS_STACK_NAME) \
	      --force-upload

describe:
	@ aws cloudformation describe-stacks \
	      --region $(AWS_REGION) \
	      --stack-name $(AWS_STACK_NAME)

outputs:
	@ make describe \
	      | jq -r '.Stacks[0].Outputs'

cleanup:
	@ aws cloudformation delete-stack \
	      --stack-name $(AWS_STACK_NAME)

###

set-openweather-api-key:
	@ aws ssm put-parameter \
	      --name openweather-api-key \
	      --value $(API-KEY) \
	      --type SecureString
