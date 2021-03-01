"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const NetDslParser_1 = require("./NetDslParser");
function Main(netDslStr) {
    console.log("文件内容:");
    console.log(netDslStr);
    console.log();
    console.log("编译错误:");
    const [net, errLst] = NetDslParser_1.NetDslParser.Parse(netDslStr);
    const model = NetDslParser_1.NetDslParser.GenerateGoJsModel(net);
    for (const errInfo of errLst) {
        console.log(errInfo.ToString());
    }
    console.log();
    console.log("拓扑图定义:");
    for (const node of net.NodeList) {
        console.log(node.ToString());
    }
    for (const edge of net.EdgeList) {
        console.log(edge.ToString());
    }
    for (const sub of net.GroupList) {
        console.log(sub.ToString());
        for (const node of sub.NodeList) {
            console.log(node.Id);
        }
        console.log(NetDslParser_1.NetDslParser.END_GROUP_NAME);
    }
    console.log();
    console.log("GoJS模型数据:");
    console.log(model.NodeArray);
    console.log(model.LinkArray);
    console.log();
}
Main(fs_1.default.readFileSync("NetDSL例子.txt", 'utf8'));
Main(fs_1.default.readFileSync('test.txt', 'utf8'));
