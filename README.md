# create-react-practice

## ✨ 介绍
一个能够快速生成react/vue项目的脚手架

## 📦 安装

```bash
npm i create-react-practice -g   // 记得全局安装
```

## 🔨 使用

```bash
rp-cli create [project-name]
```

## 效果展示

![脚手架.gif](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a4e6dee1f39e4c16bf46e636856b9084~tplv-k3u1fbpfcp-watermark.image?)

## 为什么要搭建脚手架
当我们需要重新创建一个项目时，可能需要重新去新建目录然后去创建文件，然后一步步去搭建起来我们所需要的项目环境，这无疑是一份非常投入产出比非常低的工作，我们可以把这份工作交给脚手架来做

## 初始化项目配置
首先效果肯定是实现像create-react-app或者是vue-cli等脚手架的效果

```
//直接在termial输入create-react-app [project-name] 然后就能拉取到文件（模板）了

create-react-app react-demo
```
然后使用npm init -y初始化新项目

## 获取版本号
这里我们需要参考实现用命令行输入指令能输出的功能，这里就需要用到bin，
我们这里新建一个bin文件夹，并在下面新建一个index.js文件
也新建一个src文件，下面新建一个main.js文件

```
// package.json
{
  "name": "create-react-practice",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "bin": {
    "rp-cli": "./bin/index.js",  // 这里我起的脚手架名字就叫rp-cli，你们可以自己起
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}

// bin/index.js

#! /usr/bin/env node  //这行命令是告诉bin用什么环境执行代码，这里用node执行代码
require('../src/main.js');

// src/main.js
console.log('hello world');

```
执行一下命令**npm link && rp-cli**，命令行已经打印出来了，有感觉了！

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8f55b50a52154838a7764eb6c5479b52~tplv-k3u1fbpfcp-watermark.image?)

看别的脚手架都有看版本号的功能，我们也实现一个

```
// src/main.js

//需要安装一个command npm i command --save-dev
const program = require("commander");

const { version } = require("./constants");
program.version(version).parse(process.argv);

```

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c4bd926d9f6c4a628f3345114ad8c114~tplv-k3u1fbpfcp-watermark.image?)
## create获取项目并拉取模板
### 配置指令命令
接下来就是实现拉取模板文件下来的功能, 新建create.js，我们先从github上拉取对应的github 仓库，这里我新建了一个新的github组织，fp-cli，里面放置了两个模板项目，分别是react-template和vue-template
```
// src/constants.js
const { version } = require('../package.json');

// 存储模版的位置
const downloadDirectory = `${process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE']}/.template`;

module.exports = {
    version
};

```

```
// src/main.js
const program = require("commander");
const path = require("path");

const mapActions = {
  create: {
    alias: "c",
    description: "create a project",
    examples: ["rp-cli create <project-name>"],
  },
  config: {
    alias: "conf",
    description: "config project variable",
    examples: ["rp-cli config set <k><v>", "rp-cli config get <k>"],
  },
  "*": {
    alias: "",
    description: "command not found",
    examples: [],
  },
};

// 配置命令
Reflect.ownKeys(mapActions).forEach((action) => {
  program
    .command(action) // 配置命令的名字
    .alias(mapActions[action].alias) // 命令的别名
    .description(mapActions[action].description) // 命令对应的描述
    .action(() => {
      // 访问不到对应的命令 就打印找不到命令
      if (action === "*") {
        console.log(mapActions[action].description);
      } else {
        // 截取命令
        // fp-cli create xxx // [node,fp-cli,create,xxx]
        require(path.resolve(__dirname, action))(...process.argv.slice(3));
      }
    });
});

// 监听用户的help事件
program.on("--help", () => {
  console.log("\nExamples:");
  Reflect.ownKeys(mapActions).forEach((action) => {
    mapActions[action].examples.forEach((example) => {
      console.log(`${example}`);
    });
  });
});

const { version } = require("./constants");
program.version(version).parse(process.argv);

```
### 下载模板
create.js的代码有点多，大概实现就是command和inquirer实现命令行的输出和选择，donwloadGitRepo去github上拉取对应的模板，ncp起到一个拷贝文件到本地效果

```
// /src/create.js

const axios = require("axios");
const ora = require("ora");
const Inquirer = require("inquirer");
const { promisify } = require("util");  //promisify让其支持es6语法
let downloadGitRepo = require("download-git-repo");
downloadGitRepo = promisify(downloadGitRepo);
let ncp = require("ncp");
ncp = promisify(ncp);

const { downloadDirectory } = require("./constants");
const path = require("path");

const waitFnloading =
  (fn, message) =>
  async (...args) => {
    const spinner = ora(message);
    spinner.start();
    const result = await fn(...args);
    spinner.succeed();
    return result;
  };

const fetchRepoList = async () => {
  const { data } = await axios.get("https://api.github.com/orgs/rp-cli/repos");
  return data;
};

const fetchTagList = async (repo) => {
  const { data } = await axios.get(
    `https://api.github.com/repos/rp-cli/${repo}/tags`
  );
  return data;
};

// 拼接下载的路径
const download = async (repo, tag) => {
  let api = `rp-cli/${repo}`;
  if (tag) {
    api += `#${tag}`;
  }
  const dest = `${downloadDirectory}/${repo}`;
  await downloadGitRepo(api, dest);
  return dest;
};

module.exports = async (projectName) => {
  // 1. 获取项目的模版
  let repos = await waitFnloading(fetchRepoList, "fetching template ....")();
  repos = repos.map((item) => item.name);
  // 在获取之前 显示loading 关闭loading
  // 选择模版 inquirer
  const { repo } = await Inquirer.prompt({
    name: "repo", // 获取选择后的结果
    type: "list", // 什么方式显示在命令行
    message: "please choise a template to create project", // 提示信息
    choices: repos, // 选择的数据
  });
  // 2. 获取项目的版本号
  let tag;
  let tags = await waitFnloading(fetchTagList, "fetching template ....")(repo);
  tags = tags.map((item) => item.name);
  // 如果有版本号则获取，否则不获取
  if (tags.length) {
    const res = await Inquirer.prompt({
      name: "tag",
      type: "list",
      message: "please choise tags to create project",
      choices: tags,
    });
    tag = res.tag;
  }
  // 3. 下载到对应的模板，最重要的一步
  const result = await waitFnloading(download, "download template...")(
    repo,
    tag
  );
  await ncp(result, path.resolve(projectName));
};

```
这里我们已经可以实现和开头一样拉取文件的效果了，棒棒
![脚手架.gif](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a4e6dee1f39e4c16bf46e636856b9084~tplv-k3u1fbpfcp-watermark.image?)
## 发布脚手架
最后发布一下脚手架，其实就和发布npm包一样，这里就不多赘叙啦