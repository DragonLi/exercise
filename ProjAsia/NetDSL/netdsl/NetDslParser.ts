namespace NetDslParser {
    const EMPTY_STRING = '';

    class StringBuilder {
        private _parts: string[];
        private _latest: string | null;

        constructor() {
            this._parts = [];
            this._latest = null;
        }

        Append(msg: string): StringBuilder {
            if (msg.length == 0)
                return this;
            this._latest = null;
            this._parts.push(msg);
            return this;
        }

        AppendLine(msg: string): StringBuilder {
            this._latest = null;
            this._parts.push(msg);
            this._parts.push("\n");
            return this;
        }

        ToString(): string {
            let latest = this._latest;
            if (latest == null)
                this._latest = latest = this._parts.join(EMPTY_STRING);
            return latest;
        }
    }

    class IEnumerator<T> {
        private _holder: Generator<T, T>;
        private _current: IteratorResult<T, T> | undefined;

        public constructor(holder: Generator<T, T>) {
            this._holder = holder;
        }

        public MoveNext(): boolean {
            this._current = this._holder.next();
            return !(this._current.done??false);
        }

        public get Current(): T {
            if (this._current == undefined)
                throw new Error("MoveNext first!");
            return this._current.value;
        }
    }

    class Dictionary<K,V> {
        private _map: Map<K, V>;
        constructor() {
            this._map = new Map<K,V>();
        }
        Add(key:K,val:V):void{
            this._map.set(key,val);
        }
        ContainsKey(key:K):boolean{
            return this._map.has(key);
        }
        TryGetValue(key: K):V | null {
            return this._map.get(key) ?? null;
        }
        ValuesToArray():V[] {
            const r = new Array(this._map.size);
            let index = 0;
            for (const value of this._map.values()) {
                r[index]=value;
                index++;
            }
            return r;
        }
    }

    //TODO change to dynamic expansion list
    class List<T> {
        private readonly _array: T[];

        constructor() {
            this._array=[];
        }
        Add(item:T):void{
            this._array.push(item);
        }
        [Symbol.iterator]():Iterator<T>{
            return this._array.values();
        }
        get Count():number{
            return this._array.length;
        }

        ToArray():T[] {
            return this._array;
        }
    }
    class HashSet<T> {
        private readonly _set: Set<T>;

        constructor() {
            this._set = new Set<T>();
        }

        Contains(k:T):boolean{
            return this._set.has(k);
        }

        Add(k:T):void{
            this._set.add(k);
        }
    }

    class GoJsModel {
        constructor(nodeArray: string[], linkArray: string[]) {
            this.NodeArray = nodeArray;
            this.LinkArray = linkArray;
        }

        readonly NodeArray: string[];
        readonly LinkArray: string[];

        get GoJsNodeDataArrayStr(): string {
            const sb = new StringBuilder();
            sb.AppendLine('[');
            for (const str of this.NodeArray) {
                sb.AppendLine(str);
            }
            sb.AppendLine(']');
            return sb.ToString();
        }

        get GoJsNodeLinkArrayStr(): string {
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
        constructor(pos: Position, length: number, message: string) {
            this.Pos = pos;
            this.Length = length;
            this.Message = message;
        }

        ToString(): string {
            return `(${this.Pos.LineIndex + 1},${this.Pos.ColumnIndex + 1}) | Info: ${this.Message}`;
        }

        readonly Pos: Position;
        readonly Length: number;
        readonly Message: string;
    }

    class NoError extends Info {
        constructor(pos: Position) {
            super(pos, 0, EMPTY_STRING);
        }

        ToString(): string {
            return "Success";
        }
    }

    class Warning extends Info {
        constructor(pos: Position, length: number, message: string) {
            super(pos, length, message);
        }

        ToString(): string {
            return `(${this.Pos.LineIndex + 1},${this.Pos.ColumnIndex + 1}) | Warning: ${this.Message}`;
        }
    }

    class ParsedError extends Info {
        constructor(pos: Position, length: number, message: string) {
            super(pos, length, message);
        }

        ToString(): string {
            return `(${this.Pos.LineIndex + 1},${this.Pos.ColumnIndex + 1}) | Error: ${this.Message}`;
        }
    }

    class Position {
        constructor(lineIndex: number, columnIndex: number) {
            this.LineIndex = lineIndex;
            this.ColumnIndex = columnIndex;
        }

        readonly LineIndex: number;
        readonly ColumnIndex: number;
    }

    class ParsedLine {
        Index: number;
        Start: number;
        Length: number;
        constructor(id:number=0,start:number=0,len:number=0) {
            this.Index=id;
            this.Start=start;
            this.Length=len;
        }
        get Pos(): Position {
            return new Position(this.Index, 0);
        }
    }

    class ParsedToken {
        Line: ParsedLine;
        Start: number;
        EndExclusive: number;

        constructor(Line: ParsedLine, Start: number, EndExclusive: number) {
            this.Line = Line;
            this.Start = Start;
            this.EndExclusive = EndExclusive;
        }

        get Pos(): Position {
            return new Position(this.Line.Index, this.Start - this.Line.Start);
        }

        get Length(): number {
            return this.EndExclusive - this.Start;
        }

        Is(name: string, netDslStr: string): boolean {
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

        StartWith(prefix: string, netDslStr: string):boolean {
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

        GetString(netDslStr: string): string {
            return netDslStr.substring(this.Start, this.EndExclusive);
        }
    }

    class EndOfLine extends ParsedToken
    {
    }

    class EndOfFile extends ParsedToken
    {
    }

    class Node
    {
        readonly Id: string;
        readonly Label: string;
        Group: Group | null;

        constructor(Id: string, Label: string) {
            this.Id = Id;
            this.Label = Label;
            this.Group = null;
        }

        get GoJsStr(): string {
            return "{key:\"" + this.Id + "\"}";
        }

        ToString(): string {
            return `Node Id: ${this.Id}, Label: ${this.Label}, ${this.Group?.ToString()??''}`;
        }

        static TryFindArgument(line: ParsedLine, tokenStream: IEnumerator<ParsedToken>
            , netDslStr: string, nodeSet: Dictionary<string, Node>
            , groupSet: Dictionary<string, Group>, errLst: List<Info>): Node | null {
            let id = EMPTY_STRING;
            let label = EMPTY_STRING;
            let count = 0;
            let valid = true;
            while (tokenStream.MoveNext()) {
                const token = tokenStream.Current;
                if ((token instanceof EndOfLine) || (token instanceof EndOfFile))
                {
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
            if (valid && count >= 1){
                return new Node(id,label);
            }
            return null;
        }
    }

    //TODO define another data structure "delay edge" to support delay checking of nodes
    class Edge {
        readonly Id: string;
        readonly Source: Node;
        readonly Target: Node;
        readonly Label: string;

        constructor(Id: string, Source: Node, Target: Node, Label: string) {
            this.Id = Id;
            this.Source = Source;
            this.Target = Target;
            this.Label = Label;
        }

        get GoJsStr(): string {
            return "{from: \"" + this.Source.Id + "\", to: \"" + this.Target.Id + "\"}";
        }

        ToString(): string {
            return `Edge Id: ${this.Id}, Source: ${this.Source.Id}, Target: ${this.Target.Id}, Label: ${this.Label}`;
        }

        static TryFindArgument(line: ParsedLine, tokenStream: IEnumerator<ParsedToken>
                               , netDslStr: string, nodeSet: Dictionary<string, Node>
                               , edgeSet: Dictionary<string, Edge>
                               , errLst: List<Info>): Edge | null
        {
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
                    case 2: {
                        source = nodeSet.TryGetValue(tokenStr);
                        if (source == null)
                        {
                            valid = false;
                            errLst.Add(new ParsedError(token.Pos, token.Length, `source ${tokenStr} don't exist`));
                        }
                    }
                        break;
                    case 3: {
                        target = nodeSet.TryGetValue(tokenStr);
                        if (target == null){
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
            if (valid && count >= 3 && source != null && target != null){
                return new Edge(id,source,target,label);
            }
            return null;
        }
    }

    //TODO define another data structure "delay group" to support delay checking of nodes
    class Group {
        readonly Id: string;
        readonly Label: string;
        readonly NodeList: List<Node>;

        constructor(Id: string, Label: string, NodeList: List<Node>) {
            this.Id = Id;
            this.Label = Label;
            this.NodeList = NodeList;
        }

        get GoJsStr(): string {
            return "{key:\"" + this.Id + "\", isGroup: true}";
        }

        ToString(): string {
            return `Group Id: ${this.Id}, Label: ${this.Label}`;
        }

        static TryFindArgument(line: ParsedLine, tokenStream: IEnumerator<ParsedToken>
                               , netDslStr: string, nodeSet: Dictionary<string, Node>
                               , groupSet: Dictionary<string, Group>
                               , errLst: List<Info>): Group | null
        {
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
            const NodeList = new List<Node>();
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
                        errLst.Add(new Warning(token.Pos, token.Length,
                            `node ${tokenStr} already belong to another ${node.Group.Id}`));
                    } else {
                        node.Group = gr;
                        NodeList.Add(node);
                    }
                }
            }

            if (NodeList.Count == 0) {
                errLst.Add(new Warning(line.Pos, line.Length,
                    `group ${Id} contains no nodes and is removed`));
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
        constructor(nodeList: Node[], edgeList: Edge[], groupList: Group[]) {
            this.NodeList = nodeList;
            this.EdgeList = edgeList;
            this.GroupList = groupList;
        }

        readonly NodeList: Node[];
        readonly EdgeList: Edge[];
        readonly GroupList: Group[];
    }

    function IssueNodeGroupConflict(errLst: List<Info>, token: ParsedToken, tokenStr: string) {
        errLst.Add(new ParsedError(token.Pos, token.Length, `group id conflicts with node id: ${tokenStr}`));
    }

    function IssueDuplicated(errLst: List<Info>, token: ParsedToken, tokenStr: string, ty: string): void {
        errLst.Add(new ParsedError(token.Pos, token.Length, `duplicated ${ty} ${tokenStr}`));
    }

    function IssueInsufficientParameter(line: ParsedLine, errLst: List<Info>, ty: string): void {
        errLst.Add(new ParsedError(line.Pos, line.Length, `insufficient ${ty} parameter`));
    }

    function IssueDiscardToken(errLst: List<Info>, token: ParsedToken, tokenStr: string): void {
        errLst.Add(new Warning(token.Pos, token.Length, `discard token ${tokenStr}`));
    }

    function IsWhiteSpace(char: string):boolean {
        const ch = char.charCodeAt(0);
        return ch===32 || (ch>=9 && ch<=13) || ch===133 || ch===160;
    }

    function * ParseNetDslLines(netDslStr:string):Generator<ParsedToken,ParsedToken>
    {
        let index = 0;
        let start = 0;
        let line = new ParsedLine();
        for (const max = netDslStr.length; index < max; index++)
        {
            let ch = netDslStr[index];
            if (!IsWhiteSpace(ch)) continue;
            //estimate line length
            if (index > start)
            {
                yield new ParsedToken(line,start,index);
            }

            switch (ch)
            {
                case '\n':
                    line.Length = index - line.Start;
                    yield new EndOfLine(line,index,index+1);
                    line = new ParsedLine(line.Index + 1,index + 1)
                    break;
                case '\r':
                {
                    start = index;
                    if (index + 1 < max && netDslStr[index + 1] == '\n')
                    {
                        index++;
                    }

                    line.Length = start - line.Start;
                    yield new EndOfLine(line,start,index+1);
                    line = new ParsedLine(line.Index + 1,index + 1);
                    break;
                }
            }

            //skip following whitespace except line break
            let i = index + 1;
            for (;
                i < max && (ch=netDslStr[i]) != '\n' && ch != '\r'
                && IsWhiteSpace(ch);
                i++)
            {
            }

            index = i - 1;
            start = index + 1;
        }
        //estimate line length
        line.Length = index - line.Start;
        if (index > start)
        {
            yield new ParsedToken(line,index,start);
            start = index;
        }
        //generate end of file
        return new EndOfFile(line,start,start);
    }

    function SkipLine(tokenStream: IEnumerator<ParsedToken>):void {
        while (tokenStream.MoveNext())
        {
            const token = tokenStream.Current;
            if (token instanceof EndOfLine || token instanceof EndOfFile)
            {
                break;
            }
        }
    }

    export function Parse(netDslStr:string):[Net, Info[]]
    {
        const errLst = new List<Info>();
        const nodeSet = new Dictionary<string, Node>();
        const edgeSet = new Dictionary<string, Edge>();
        const groupSet = new Dictionary<string, Group>();
        const srcTargetSet = new HashSet<[Node, Node]>();
        let lastPos = new Position(0, 0);
        const tokenStream = new IEnumerator(ParseNetDslLines(netDslStr));
        while (tokenStream.MoveNext())
        {
            const token = tokenStream.Current;
            const line = token.Line;
            if (token.Is("node", netDslStr))
            {
                const node = Node.TryFindArgument(line, tokenStream, netDslStr, nodeSet,groupSet,errLst);
                if (node != null)
                {
                    nodeSet.Add(node.Id, node);
                }
                continue;
            }

            if (token.Is("edge", netDslStr))
            {
                const edge = Edge.TryFindArgument(line, tokenStream, netDslStr, nodeSet, edgeSet, errLst);
                if (edge != null)
                {
                    const pair: [Node, Node] = [edge.Source, edge.Target];
                    if (srcTargetSet.Contains(pair))
                    {
                        errLst.Add(new Warning(line.Pos, line.Length,
                            "edge with same source and target already exist {edge.Id}"));
                    }

                    srcTargetSet.Add(pair);
                    edgeSet.Add(edge.Id, edge);
                }

                continue;
            }

            if (token.Is("group", netDslStr))
            {
                const gr = Group.TryFindArgument(line, tokenStream, netDslStr, nodeSet, groupSet, errLst);
                if (gr != null)
                {
                    groupSet.Add(gr.Id, gr);
                }

                continue;
            }

            if (token.StartWith("//", netDslStr)){
                SkipLine(tokenStream)
                continue;
            }

            if (token instanceof EndOfLine || token instanceof EndOfFile)
            {
                if (token instanceof EndOfFile)
                    lastPos = token.Pos;
                continue;
            }

            errLst.Add(new ParsedError(line.Pos, line.Length,
                "expect node/edge/group..endgroup"));
        }

        const net = new Net(nodeSet.ValuesToArray(), edgeSet.ValuesToArray(), groupSet.ValuesToArray());
        if (errLst.Count != 0)
            return [net, errLst.ToArray()];

        const noError = new NoError(lastPos);
        return [net, [noError]];
    }

    export function GenerateGoJsModel(net: Net): GoJsModel {
        const nodes = new Array<string>(net.NodeList.length + net.GroupList.length);
        const edgeNum = net.EdgeList.length;
        const edges = new Array<string>(edgeNum);
        let index = 0;
        for (const node of net.NodeList) {
            nodes[index]=node.GoJsStr;
            index++;
        }
        for (const gr of net.GroupList) {
            nodes[index]=gr.GoJsStr;
            index++;
        }
        index=0;
        for (const edge of net.EdgeList) {
            edges[index]=edge.GoJsStr;
            index++;
        }
        return new GoJsModel(nodes, edges);
    }
}

//TODO test codes only, shall not include
function Main(netDslStr: string) {
    const [net,errLst] = NetDslParser.Parse(netDslStr);
    const model = NetDslParser.GenerateGoJsModel(net);

    for (const errInfo of errLst)
    {
        console.log(errInfo.ToString());
    }

    console.log();
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
`
Main(netDslStr);