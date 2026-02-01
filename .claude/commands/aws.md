# /aws Command

Run AWS CLI commands with SSO authentication.

## Instructions

When the user invokes `/aws`, execute AWS commands using the SSO profile.

### AWS Profile
```
AdministratorAccess-168504280929
```

### Usage Patterns

1. **Login to AWS SSO** (if credentials expired): `/aws login`
   ```bash
   aws sso login --profile AdministratorAccess-168504280929
   ```

2. **Run any AWS command**: `/aws lambda list-functions`
   ```bash
   aws --profile AdministratorAccess-168504280929 <command>
   ```

3. **Deploy Lambda function**: `/aws deploy-lambda <function-name>`
   - Zip the function code
   - Upload using `aws lambda update-function-code`

   Example for llm-council:
   ```bash
   cd lambda/llm-council && zip -r function.zip index.mjs && aws --profile AdministratorAccess-168504280929 lambda update-function-code --function-name llm-council --zip-file fileb://function.zip --region us-west-2
   ```

### Common Commands

- **List Lambda functions**: `/aws lambda list-functions --region us-west-2`
- **Get Lambda logs**: `/aws logs tail /aws/lambda/<function-name> --follow --region us-west-2`
- **Invoke Lambda**: `/aws lambda invoke --function-name <name> --payload '{}' output.json --region us-west-2`

### Auto-Login

Before running any AWS command, first check if credentials are valid:
```bash
aws --profile AdministratorAccess-168504280929 sts get-caller-identity
```

If this fails with an expired token error, automatically run:
```bash
aws sso login --profile AdministratorAccess-168504280929
```

Then retry the original command.

### Arguments

$ARGUMENTS - The AWS CLI command to run (e.g., "login", "lambda list-functions", "deploy-lambda llm-council")
