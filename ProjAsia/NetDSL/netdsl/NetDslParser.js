"use strict";
var NetDslParser;
(function (NetDslParser) {
    const EMPTY_STRING = '';
    class StringBuilder {
        constructor() {
            this._parts = [];
            this._latest = null;
        }
        Append(msg) {
            if (msg.length == 0)
                return this;
            this._latest = null;
            this._parts.push(msg);
            return this;
        }
        AppendLine(msg) {
            this._latest = null;
            this._parts.push(msg);
            this._parts.push("\n");
            return this;
        }
        ToString() {
            let latest = this._latest;
            if (latest == null)
                this._latest = latest = this._parts.join(EMPTY_STRING);
            return latest;
        }
    }
    class IEnumerator {
        constructor(holder) {
            this._holder = holder;
        }
        MoveNext() {
            var _a;
            this._current = this._holder.next();
            return !((_a = this._current.done) !== null && _a !== void 0 ? _a : false);
        }
        get Current() {
            if (this._current == undefined)
                throw new Error("MoveNext first!");
            return this._current.value;
        }
    }
    class Dictionary {
        constructor() {
            this._map = new Map();
        }
        Add(key, val) {
            this._map.set(key, val);
        }
        ContainsKey(key) {
            return this._map.has(key);
        }
        TryGetValue(key) {
            var _a;
            return (_a = this._map.get(key)) !== null && _a !== void 0 ? _a : null;
        }
        ValuesToArray() {
            const r = new Array(this._map.size);
            let index = 0;
            for (const value of this._map.values()) {
                r[index] = value;
                index++;
            }
            return r;
        }
    }
    //TODO change to dynamic expansion list
    class List {
        constructor() {
            this._array = [];
        }
        Add(item) {
            this._array.push(item);
        }
        [Symbol.iterator]() {
            return this._array.values();
        }
        get Count() {
            return this._array.length;
        }
        ToArray() {
            return this._array;
        }
    }
    class HashSet {
        constructor() {
            this._set = new Set();
        }
        Contains(k) {
            return this._set.has(k);
        }
        Add(k) {
            this._set.add(k);
        }
    }
    class GoJsModel {
        constructor(nodeArray, linkArray) {
            this.NodeArray = nodeArray;
            this.LinkArray = linkArray;
        }
        get GoJsNodeDataArrayStr() {
            const sb = new StringBuilder();
            sb.AppendLine('[');
            for (const str of this.NodeArray) {
                sb.AppendLine(str);
            }
            sb.AppendLine(']');
            return sb.ToString();
        }
        get GoJsNodeLinkArrayStr() {
            const sb = new StringBuilder();
            sb.AppendLine('[');
            for (const str of this.LinkArray) {
                sb.AppendLine(str);
            }
            sb.AppendLine(']');
            return sb.ToString();
        }
    }
    class Info {
        constructor(pos, length, message) {
            this.Pos = pos;
            this.Length = length;
            this.Message = message;
        }
        ToString() {
            return `(${this.Pos.LineIndex + 1},${this.Pos.ColumnIndex + 1}) | Info: ${this.Message}`;
        }
    }
    class NoError extends Info {
        constructor(pos) {
            super(pos, 0, EMPTY_STRING);
        }
        ToString() {
            return "Success";
        }
    }
    class Warning extends Info {
        constructor(pos, length, message) {
            super(pos, length, message);
        }
        ToString() {
            return `(${this.Pos.LineIndex + 1},${this.Pos.ColumnIndex + 1}) | Warning: ${this.Message}`;
        }
    }
    class ParsedError extends Info {
        constructor(pos, length, message) {
            super(pos, length, message);
        }
        ToString() {
            return `(${this.Pos.LineIndex + 1},${this.Pos.ColumnIndex + 1}) | Error: ${this.Message}`;
        }
    }
    class Position {
        constructor(lineIndex, columnIndex) {
            this.LineIndex = lineIndex;
            this.ColumnIndex = columnIndex;
        }
    }
    class ParsedLine {
        constructor(id = 0, start = 0, len = 0) {
            this.Index = id;
            this.Start = start;
            this.Length = len;
        }
        get Pos() {
            return new Position(this.Index, 0);
        }
    }
    class ParsedToken {
        constructor(Line, Start, EndExclusive) {
            this.Line = Line;
            this.Start = Start;
            this.EndExclusive = EndExclusive;
        }
        get Pos() {
            return new Position(this.Line.Index, this.Start - this.Line.Start);
        }
        get Length() {
            return this.EndExclusive - this.Start;
        }
        Is(name, netDslStr) {
            const len = name.length;
            if (this.EndExclusive - this.Start != len) {
                return false;
            }
            for (let index = 0; index < len; index++) {
                const ch = name.charAt(index);
                if (ch != netDslStr.charAt(index + this.Start).toLowerCase()) {
                    return false;
                }
            }
            return true;
        }
        StartWith(prefix, netDslStr) {
            const len = prefix.length;
            if (this.EndExclusive - this.Start < len) {
                return false;
            }
            for (let index = 0; index < len; index++) {
                const ch = prefix.charAt(index);
                if (ch != netDslStr.charAt(index + this.Start).toLowerCase()) {
                    return false;
                }
            }
            return true;
        }
        GetString(netDslStr) {
            return netDslStr.substring(this.Start, this.EndExclusive);
        }
    }
    class EndOfLine extends ParsedToken {
    }
    class EndOfFile extends ParsedToken {
    }
    class Node {
        constructor(Id, Label) {
            this.Id = Id;
            this.Label = Label;
            this.Group = null;
        }
        get GoJsStr() {
            return "{key:\"" + this.Id + "\"}";
        }
        ToString() {
            var _a, _b;
            return `Node Id: ${this.Id}, Label: ${this.Label}, ${(_b = (_a = this.Group) === null || _a === void 0 ? void 0 : _a.ToString()) !== null && _b !== void 0 ? _b : ''}`;
        }
        static TryFindArgument(line, tokenStream, netDslStr, nodeSet, groupSet, errLst) {
            let id = EMPTY_STRING;
            let label = EMPTY_STRING;
            let count = 0;
            let valid = true;
            while (tokenStream.MoveNext()) {
                const token = tokenStream.Current;
                if ((token instanceof EndOfLine) || (token instanceof EndOfFile)) {
                    break;
                }
                count++;
                const tokenStr = token.GetString(netDslStr);
                switch (count) {
                    case 1:
                        id = tokenStr;
                        if (nodeSet.ContainsKey(tokenStr)) {
                            valid = false;
                            IssueDuplicated(errLst, token, tokenStr, "node");
                        }
                        if (groupSet.ContainsKey(tokenStr)) {
                            valid = false;
                            IssueNodeGroupConflict(errLst, token, tokenStr);
                        }
                        break;
                    case 2:
                        label = tokenStr;
                        break;
                    default: {
                        IssueDiscardToken(errLst, token, tokenStr);
                        break;
                    }
                }
            }
            if (count < 1) {
                IssueInsufficientParameter(line, errLst, "node");
            }
            if (valid && count >= 1) {
                return new Node(id, label);
            }
            return null;
        }
    }
    //TODO define another data structure "delay edge" to support delay checking of nodes
    class Edge {
        constructor(Id, Source, Target, Label) {
            this.Id = Id;
            this.Source = Source;
            this.Target = Target;
            this.Label = Label;
        }
        get GoJsStr() {
            return "{from: \"" + this.Source.Id + "\", to: \"" + this.Target.Id + "\"}";
        }
        ToString() {
            return `Edge Id: ${this.Id}, Source: ${this.Source.Id}, Target: ${this.Target.Id}, Label: ${this.Label}`;
        }
        static TryFindArgument(line, tokenStream, netDslStr, nodeSet, edgeSet, errLst) {
            let id = EMPTY_STRING;
            let source = null;
            let target = null;
            let label = EMPTY_STRING;
            let count = 0;
            let valid = true;
            while (tokenStream.MoveNext()) {
                const token = tokenStream.Current;
                if (token instanceof EndOfLine || token instanceof EndOfFile) {
                    break;
                }
                count++;
                const tokenStr = token.GetString(netDslStr);
                switch (count) {
                    case 1:
                        id = tokenStr;
                        if (edgeSet.ContainsKey(tokenStr)) {
                            valid = false;
                            IssueDuplicated(errLst, token, tokenStr, "edge");
                        }
                        break;
                    case 2:
                        {
                            source = nodeSet.TryGetValue(tokenStr);
                            if (source == null) {
                                valid = false;
                                errLst.Add(new ParsedError(token.Pos, token.Length, `source ${tokenStr} don't exist`));
                            }
                        }
                        break;
                    case 3:
                        {
                            target = nodeSet.TryGetValue(tokenStr);
                            if (target == null) {
                                valid = false;
                                errLst.Add(new ParsedError(token.Pos, token.Length, `target ${tokenStr} don't exist`));
                            }
                        }
                        break;
                    case 4:
                        label = tokenStr;
                        break;
                    default: {
                        IssueDiscardToken(errLst, token, tokenStr);
                        break;
                    }
                }
            }
            if (count < 3) {
                IssueInsufficientParameter(line, errLst, "edge");
            }
            //duplicate check because I need to convince compiler that s/t is non-null
            if (valid && count >= 3 && source != null && target != null) {
                return new Edge(id, source, target, label);
            }
            return null;
        }
    }
    //TODO define another data structure "delay group" to support delay checking of nodes
    class Group {
        constructor(Id, Label, NodeList) {
            this.Id = Id;
            this.Label = Label;
            this.NodeList = NodeList;
        }
        get GoJsStr() {
            return "{key:\"" + this.Id + "\", isGroup: true}";
        }
        ToString() {
            return `Group Id: ${this.Id}, Label: ${this.Label}`;
        }
        static TryFindArgument(line, tokenStream, netDslStr, nodeSet, groupSet, errLst) {
            let Id = EMPTY_STRING;
            let Label = EMPTY_STRING;
            let count = 0;
            let valid = true;
            while (tokenStream.MoveNext()) {
                const token = tokenStream.Current;
                if (token instanceof EndOfLine || token instanceof EndOfFile) {
                    break;
                }
                count++;
                const tokenStr = token.GetString(netDslStr);
                switch (count) {
                    case 1:
                        Id = tokenStr;
                        if (groupSet.ContainsKey(tokenStr)) {
                            valid = false;
                            IssueDuplicated(errLst, token, tokenStr, "group");
                        }
                        if (nodeSet.ContainsKey(tokenStr)) {
                            valid = false;
                            IssueNodeGroupConflict(errLst, token, tokenStr);
                        }
                        break;
                    case 2:
                        Label = tokenStr;
                        break;
                    default: {
                        IssueDiscardToken(errLst, token, tokenStr);
                        break;
                    }
                }
            }
            if (!(valid && count >= 1)) {
                if (count < 1) {
                    IssueInsufficientParameter(line, errLst, "group");
                }
                return null;
            }
            //assume following tokens are node ids until "endgroup" is meet
            let endGroup = false;
            const NodeList = new List();
            const gr = new Group(Id, Label, NodeList);
            while (tokenStream.MoveNext()) {
                let token = tokenStream.Current;
                if (token instanceof EndOfFile) {
                    break;
                }
                if (token instanceof EndOfLine)
                    continue;
                if (token.Is("endgroup", netDslStr)) {
                    endGroup = true;
                    //skip tokens in the same line
                    while (tokenStream.MoveNext()) {
                        token = tokenStream.Current;
                        if (token instanceof EndOfLine || token instanceof EndOfFile) {
                            break;
                        }
                        IssueDiscardToken(errLst, token, token.GetString(netDslStr));
                    }
                    break;
                }
                const tokenStr = token.GetString(netDslStr);
                const node = nodeSet.TryGetValue(tokenStr);
                if (node != null) {
                    if (node.Group != null) {
                        errLst.Add(new Warning(token.Pos, token.Length, `node ${tokenStr} already belong to another ${node.Group.Id}`));
                    }
                    else {
                        node.Group = gr;
                        NodeList.Add(node);
                    }
                }
            }
            if (NodeList.Count == 0) {
                errLst.Add(new Warning(line.Pos, line.Length, `group ${Id} contains no nodes and is removed`));
            }
            if (!endGroup) {
                for (const node of NodeList) {
                    node.Group = null;
                }
            }
            if (endGroup && NodeList.Count > 0) {
                return gr;
            }
            return null;
        }
    }
    class Net {
        constructor(nodeList, edgeList, groupList) {
            this.NodeList = nodeList;
            this.EdgeList = edgeList;
            this.GroupList = groupList;
        }
    }
    function IssueNodeGroupConflict(errLst, token, tokenStr) {
        errLst.Add(new ParsedError(token.Pos, token.Length, `group id conflicts with node id: ${tokenStr}`));
    }
    function IssueDuplicated(errLst, token, tokenStr, ty) {
        errLst.Add(new ParsedError(token.Pos, token.Length, `duplicated ${ty} ${tokenStr}`));
    }
    function IssueInsufficientParameter(line, errLst, ty) {
        errLst.Add(new ParsedError(line.Pos, line.Length, `insufficient ${ty} parameter`));
    }
    function IssueDiscardToken(errLst, token, tokenStr) {
        errLst.Add(new Warning(token.Pos, token.Length, `discard token ${tokenStr}`));
    }
    function IsWhiteSpace(char) {
        const ch = char.charCodeAt(0);
        return ch === 32 || (ch >= 9 && ch <= 13) || ch === 133 || ch === 160;
    }
    function* ParseNetDslLines(netDslStr) {
        let index = 0;
        let start = 0;
        let line = new ParsedLine();
        for (const max = netDslStr.length; index < max; index++) {
            let ch = netDslStr[index];
            if (!IsWhiteSpace(ch))
                continue;
            //estimate line length
            if (index > start) {
                yield new ParsedToken(line, start, index);
            }
            switch (ch) {
                case '\n':
                    line.Length = index - line.Start;
                    yield new EndOfLine(line, index, index + 1);
                    line = new ParsedLine(line.Index + 1, index + 1);
                    break;
                case '\r':
                    {
                        start = index;
                        if (index + 1 < max && netDslStr[index + 1] == '\n') {
                            index++;
                        }
                        line.Length = start - line.Start;
                        yield new EndOfLine(line, start, index + 1);
                        line = new ParsedLine(line.Index + 1, index + 1);
                        break;
                    }
            }
            //skip following whitespace except line break
            let i = index + 1;
            for (; i < max && (ch = netDslStr[i]) != '\n' && ch != '\r'
                && IsWhiteSpace(ch); i++) {
            }
            index = i - 1;
            start = index + 1;
        }
        //estimate line length
        line.Length = index - line.Start;
        if (index > start) {
            yield new ParsedToken(line, index, start);
            start = index;
        }
        //generate end of file
        return new EndOfFile(line, start, start);
    }
    function SkipLine(tokenStream) {
        while (tokenStream.MoveNext()) {
            const token = tokenStream.Current;
            if (token instanceof EndOfLine || token instanceof EndOfFile) {
                break;
            }
        }
    }
    function Parse(netDslStr) {
        const errLst = new List();
        const nodeSet = new Dictionary();
        const edgeSet = new Dictionary();
        const groupSet = new Dictionary();
        const srcTargetSet = new HashSet();
        let lastPos = new Position(0, 0);
        const tokenStream = new IEnumerator(ParseNetDslLines(netDslStr));
        while (tokenStream.MoveNext()) {
            const token = tokenStream.Current;
            const line = token.Line;
            if (token.Is("node", netDslStr)) {
                const node = Node.TryFindArgument(line, tokenStream, netDslStr, nodeSet, groupSet, errLst);
                if (node != null) {
                    nodeSet.Add(node.Id, node);
                }
                continue;
            }
            if (token.Is("edge", netDslStr)) {
                const edge = Edge.TryFindArgument(line, tokenStream, netDslStr, nodeSet, edgeSet, errLst);
                if (edge != null) {
                    const pair = [edge.Source, edge.Target];
                    if (srcTargetSet.Contains(pair)) {
                        errLst.Add(new Warning(line.Pos, line.Length, "edge with same source and target already exist {edge.Id}"));
                    }
                    srcTargetSet.Add(pair);
                    edgeSet.Add(edge.Id, edge);
                }
                continue;
            }
            if (token.Is("group", netDslStr)) {
                const gr = Group.TryFindArgument(line, tokenStream, netDslStr, nodeSet, groupSet, errLst);
                if (gr != null) {
                    groupSet.Add(gr.Id, gr);
                }
                continue;
            }
            if (token.StartWith("//", netDslStr)) {
                SkipLine(tokenStream);
                continue;
            }
            if (token instanceof EndOfLine || token instanceof EndOfFile) {
                if (token instanceof EndOfFile)
                    lastPos = token.Pos;
                continue;
            }
            errLst.Add(new ParsedError(line.Pos, line.Length, "expect node/edge/group..endgroup"));
        }
        const net = new Net(nodeSet.ValuesToArray(), edgeSet.ValuesToArray(), groupSet.ValuesToArray());
        if (errLst.Count != 0)
            return [net, errLst.ToArray()];
        const noError = new NoError(lastPos);
        return [net, [noError]];
    }
    NetDslParser.Parse = Parse;
    function GenerateGoJsModel(net) {
        const nodes = new Array(net.NodeList.length + net.GroupList.length);
        const edgeNum = net.EdgeList.length;
        const edges = new Array(edgeNum);
        let index = 0;
        for (const node of net.NodeList) {
            nodes[index] = node.GoJsStr;
            index++;
        }
        for (const gr of net.GroupList) {
            nodes[index] = gr.GoJsStr;
            index++;
        }
        index = 0;
        for (const edge of net.EdgeList) {
            edges[index] = edge.GoJsStr;
            index++;
        }
        return new GoJsModel(nodes, edges);
    }
    NetDslParser.GenerateGoJsModel = GenerateGoJsModel;
})(NetDslParser || (NetDslParser = {}));
//TODO test codes only, shall not include
function Main(netDslStr) {
    const [net, errLst] = NetDslParser.Parse(netDslStr);
    const model = NetDslParser.GenerateGoJsModel(net);
    for (const errInfo of errLst) {
        console.log(errInfo.ToString());
    }
    console.log();
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
        console.log("endgroup");
    }
    console.log();
    console.log(model.GoJsNodeDataArrayStr);
    console.log(model.GoJsNodeLinkArrayStr);
}
const netDslStr = `node node1 label1 nodeIgnores
node node2
node node3 label3
edge edge1 node1 node2 label2 edgeIgnores
edge edge2 node1 node3
edge edge3 node1 node3 edgeLabel3
group group1 label4 groupIgnores
node1 node2
node3 node4
endgroup endGroupIgnores

//invalid lines followed
node
node node1
node group1
edge
edge edge1
edge edge4 node1
edge edge4 node node
group
group node1
node1
endgroup
group group1
node1
endgroup
group group2
node1
endgroup
group group3
endgroup
group group4
node3
`;
Main(netDslStr);
