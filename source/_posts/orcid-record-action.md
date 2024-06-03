---
title: 使用GitHub Action自动抓取ORCID记录
lang: zh-CN
date: 2024-06-03 11:58:00
categories:
  - Blog
tags:
  - 持续集成
  - 前端
---

# ORCID Record GitHub Action
我做了一个GitHub Action，利用ORCID的公共API自动抓取研究人员的记录，包括其发表、作者、期刊和时间等等。因为原始API这些信息是位于不同URI下的，因此我进行了整合以写入到一个单独的JSON文件中。这个Action目前可以在[GitHub Action市场](https://github.com/marketplace/actions/orcid-record-action)中安装，用法如下。

## ORCID API配置
### 1. 注册你的个人公共API客户端
首先登录你的ORCID账号，进入[developer tools](https://orcid.org/developer-tools)页面创建你的个人API客户端。详细的步骤请参考[官方文档](https://info.orcid.org/documentation/features/public-api)。应用信息和重定向地址可以随便填。

记住你的 __Client ID__ 和 __Client secret__。

### 2. 获取你的访问令牌
在命令行中，用你的 __Client ID__ 和 __Client secret__ 来获取你的 __访问令牌__。官方目前默认给20年的超长有效期，因此获取这个令牌的命令只需要执行一次，我没有写到Action中：
```bash
curl -H "Accept: application/json" -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode
 "client_id=CLIENT_ID" --data-urlencode "client_secret=CLIENT_SECRET" --data-urlencode
 "scope=/read-public" --data-urlencode "grant_type=client_credentials" https://orcid.org/oauth/token
```
然后你就可以得到一个JSON格式的响应：
```json
{"access_token":"xxx","token_type":"bearer","refresh_token":"xxx","expires_in":631138518,"scope":"/read-public","orcid":null}
```
这里**access_toke**就是要记住的**访问令牌**。

## 输入
### `orcid-id`
**必须** 研究人员的ORCID ID。

### `access-token`
**必须** 上面获取到的**访问令牌**。

### `record-file`
**可选** 要写入结果的JSON文件地址（相对于仓库根目录）。如果这个输入给了，`record`输出就不会有。

## 输出
### `record`
JSON格式的记录字符串。这个输出只有在`record-file`输入没有的时候才会产生。

## 示例
### 1. （可选）在GitHub中保存你的访问令牌和变量
在 https://github.com/USERNAME/REPOSITORY/settings/secrets/actions 中创建新的仓库级别密钥（Secret）来保存你的访问令牌，这里我们将其命名为**ORCID_ACCESS_TOKEN**。

然后还是这个页面，切到**Variables**选项卡，创建以下的变量：

|         名称         |             描述              |                  示例                  |
|:------------------:|:---------------------------:|:------------------------------------:|
|      ORCID_ID      |        研究人员的ORCID ID        |         XXXX-XXXX-XXXX-XXXX          |
| ORCID_ACCESS_TOKEN |       你的ORCID API访问令牌       | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
|    RECORD_FILE     | 要写入记录的JSON文件路径（可选，相对于仓库根目录） |         assets/record.json           |

### 2. 创建一个Action来自动更新ORCID记录

示例工作流代码如下：
```yaml
name: Update Record

on:
  # 创建一个定期循环任务，这里我们设置为每月1号0点0分
  schedule:
    - cron: "0 0 1 * *"
  # 允许手动执行工作流
  workflow_dispatch:

permissions:
  contents: write
  
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4
    
    # 使用ORCID ID和访问令牌抓取ORCID记录
    - name: Get record with token
      uses: sxlllslgh/orcid-record-action@v1
      id: record
      with:
        orcid-id: ${{ vars.ORCID_ID }}
        access-token: ${{ secrets.ORCID_ACCESS_TOKEN }}
        record-file: ${{ vars.RECORD_FILE }}
      
    - name: Make sure the record file is tracked
      run: git add ${{ vars.RECORD_FILE }}

    # 如果记录文件有变化，返回退出代码1，否则返回0
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