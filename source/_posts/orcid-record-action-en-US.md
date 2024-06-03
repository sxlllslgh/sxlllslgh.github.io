---
title: ORCID Record Action Usage
lang: en-US
date: 2024-06-03 11:58:00
categories:
  - Blog
tags:
  - CI
  - Frontend
---

# ORCID Record Action
I developed a GitHub action to automatically fetch record, including personal information, publications, authors, etc. The action page is available at [GitHub Action Marketplace](https://github.com/marketplace/actions/orcid-record-action), and here is the manual.

## ORCID API Configurations
### 1. Register your personal public API client
Log in your ORCID account and visit the [developer tools](https://orcid.org/developer-tools) page, create your personal public API client. Detailed steps please refer the [offical document](https://info.orcid.org/documentation/features/public-api). You can fill in application information and redirect URIs as you like, it has no effect on the subsequent steps.

Please remember your __Client ID__ and __Client secret__.

### 2. Get your access token
In command line, use your __Client ID__ and __Client secret__ to get your __access token__. It should have a very long expiration time (about 20 years):
```bash
curl -H "Accept: application/json" -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode
 "client_id=CLIENT_ID" --data-urlencode "client_secret=CLIENT_SECRET" --data-urlencode
 "scope=/read-public" --data-urlencode "grant_type=client_credentials" https://orcid.org/oauth/token
```
Then you may get a response in JSON format:
```json
{"access_token":"xxx","token_type":"bearer","refresh_token":"xxx","expires_in":631138518,"scope":"/read-public","orcid":null}
```
Please remember the __access_token__.

## Inputs
### `orcid-id`
**Required** The ORCID ID of researcher.

### `access-token`
**Required** The ORCID access token obtained above.

### `record-file`
**Optional** The record json file to write. If this input was given, the output `record` will not be generated.

## Outputs
### `record`
The record string in JSON format. This output only exists when the `record-file` input is not given.

## Example usage
### 1. (Optional) Save your access token and other variables in GitHub
Create a new __repository secret__ in https://github.com/USERNAME/REPOSITORY/settings/secrets/actions, create a new repository secret to store your __access_token__ obtained above. Here we name it __ORCID_ACCESS_TOKEN__.

Further, in this page, switch to the __Variables__ tab, create follow variables for your workflow:
| Name | Description | Example |
|:-:|:-:|:-:|
| ORCID_ID | Your ORCID id. | XXXX-XXXX-XXXX-XXXX |
| ORCID_ACCESS_TOKEN | The ORCID public api access token. | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| RECORD_FILE | The related path of the works file in your repository. | assets/record.json |

### 2. Create an action to auto update your ORCID record.

The workflow's code is as follows:
```yaml
name: Update Record

on:
  # Create a scheduled task, in this example we run it at the first day of every month.
  schedule:
    - cron: "0 0 1 * *"
  # Enable manually executing.
  workflow_dispatch:

permissions:
  contents: write
  
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4
    
    # Fetch record with orcid id and access token
    - name: Get record with token
      uses: sxlllslgh/orcid-record-action@v1
      id: record
      with:
        orcid-id: ${{ vars.ORCID_ID }}
        access-token: ${{ secrets.ORCID_ACCESS_TOKEN }}
        record-file: ${{ vars.RECORD_FILE }}
      
    - name: Make sure the record file is tracked
      run: git add ${{ vars.RECORD_FILE }}

    # If record file changed, return exit code 1, otherwise 0.
    - name: Judge if file changed
      id: changed
      continue-on-error: true
      run: git diff --exit-code ${{ vars.RECORD_FILE }}

    - name: Judge if staged file changed
      id: cached
      continue-on-error: true
      run: git diff --exit-code --cached ${{ vars.RECORD_FILE }}

    - name: Update record
      if: ${{ steps.changed.outcome == 'failure' || steps.cached.outcome == 'failure' }}
      run: |
          git config --global user.name '${{ vars.GIT_USERNAME }}'
          git config --global user.email '${{ vars.GIT_EMAIL }}'
          git commit -am "Automatically update record."
          git push
```