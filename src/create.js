const axios = require("axios");
const ora = require("ora");
const Inquirer = require("inquirer");
const { promisify } = require("util");
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

