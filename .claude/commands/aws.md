# /aws Command

Run AWS CLI commands with SSO authentication.

## Instructions

When the user invokes `/aws`, you MUST:

1. **First, check if credentials are valid**:
   ```bash
   aws --profile AdministratorAccess-168504280929 sts get-caller-identity 2>&1
   ```

2. **If credentials are expired**, run SSO login and wait for it to complete:
   ```bash
   aws sso login --profile AdministratorAccess-168504280929
   ```
   This will open a browser for the user to authenticate. Wait for the login to complete.

3. **Then execute the requested AWS command** with the profile.

You handle the entire flow - login if needed, then complete the task. Do not ask the user to login manually.

### AWS Profile
```
AdministratorAccess-168504280929
```

### Default Region
```
us-west-2
```

### Usage Examples

1. **Deploy Lambda function**: `/aws deploy-lambda llm-council`
   ```bash
   cd lambda/llm-council && zip -r function.zip index.mjs && aws --profile AdministratorAccess-168504280929 lambda update-function-code --function-name llm-council --zip-file fileb://function.zip --region us-west-2
   ```

2. **Any AWS command**: `/aws lambda list-functions`
   ```bash
   aws --profile AdministratorAccess-168504280929 lambda list-functions --region us-west-2
   ```

3. **Get Lambda logs**: `/aws logs llm-council`
   ```bash
   aws --profile AdministratorAccess-168504280929 logs tail /aws/lambda/llm-council --follow --region us-west-2
   ```

### Arguments

$ARGUMENTS - The AWS task to perform (e.g., "deploy-lambda llm-council", "lambda list-functions")
