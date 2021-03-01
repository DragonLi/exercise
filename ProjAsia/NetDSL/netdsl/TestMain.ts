import fs from 'fs';
import {NetDslParser} from "./NetDslParser";

function Main(netDslStr: string) {
    console.log("文件内容:");
    console.log(netDslStr);
    console.log();
    console.log("编译错误:");
    const [net,errLst] = NetDslParser.Parse(netDslStr);
    const model = NetDslParser.GenerateGoJsModel(net);

    for (const errInfo of errLst)
    {
        console.log(errInfo.ToString());
    }

    console.log();
    console.log("拓扑图定义:");
    for (const node of net.NodeList)
    {
        console.log(node.ToString());
    }
    for (const edge of net.EdgeList)
    {
        console.log(edge.ToString());
    }
    for (const sub of net.GroupList)
    {
        console.log(sub.ToString());
        for (const node of sub.NodeList)
        {
            console.log(node.Id);
        }
        console.log(NetDslParser.END_GROUP_NAME);
    }
    console.log();
    console.log("GoJS模型数据:");
    console.log(model.NodeArray);
    console.log(model.LinkArray);
    console.log();
}

Main(fs.readFileSync("NetDSL例子.txt",'utf8'));

Main(fs.readFileSync('test.txt','utf8'));