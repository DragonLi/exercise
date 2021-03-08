export namespace NetDslParser {
    export const EMPTY_STRING = '';
    export const NODE_NAME = "node";
    export const EDGE_NAME = "edge";
    export const GROUP_NAME = "group";
    export const END_GROUP_NAME = "endgroup";
    export const COMMENT_PREFIX = "//";

    export const ERR_SUCCESS = 0;
    export const ERR_INVALID_LINE_START = 1;
    export const ERR_ID_CONFLICT = 2;
    export const ERR_NODE_NOT_FOUND = 3;
    export const ERR_INSUFFICIENT_PARAM = 4;
    export const ERR_DUPLICATED_ID = 5;
    export const ERR_ANOTHER_GROUP = 6;
    export const WARN_TOKEN_DISCARD = 7;
    export const WARN_GROUP_DISCARD = 8;
    export const WARN_EDGE_SAME_SRC_TARGET = 9;
    export const WARN_DUPLICATE_ASSIGN_GROUP = 10;

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

    class TupleSet<T> {
        private readonly _set:Map<T,Set<T>>;

        constructor() {
            this._set = new Map<T, Set<T>>();
        }

        Add(k1:T,k2:T):void{
            const v = this._set.get(k1)??new Set<T>();
            if (v.size == 0){
                this._set.set(k1,v);
            }
            v.add(k2);
        }
        Contains(k1:T,k2:T):boolean{
            const v = this._set.get(k1);
            return v?.has(k2)??false;
        }
    }

    type GoJsNode = {key:string,isGroup?:boolean,group?:string,text?:string};
    type GoJsLink = {from:string,to:string};

    class GoJsModel {
        constructor(nodeArray: GoJsNode[], linkArray: GoJsLink[]) {
            this.NodeArray = nodeArray;
            this.LinkArray = linkArray;
        }

        readonly NodeArray: GoJsNode[];
        readonly LinkArray: GoJsLink[];
    }

    class Info {
        constructor(pos: Position, length: number, message: string,code:number) {
            this.Pos = pos;
            this.Length = length;
            this.Message = message;
            this.ErrorCode = code;
        }

        ToString(): string {
            return `Info | ${this.ErrorCode} | (${this.Pos.LineIndex + 1},${this.Pos.ColumnIndex + 1}) : ${this.Message}`;
        }

        readonly Pos: Position;
        readonly Length: number;
        readonly Message: string;
        readonly ErrorCode: number;
    }

    class NoError extends Info {
        constructor(pos: Position) {
            super(pos, 0, EMPTY_STRING,ERR_SUCCESS);
        }

        ToString(): string {
            return "Success";
        }
    }

    class Warning extends Info {
        constructor(pos: Position, length: number, message: string,code:number) {
            super(pos, length, message,code);
        }

        ToString(): string {
            return `Warning | ${this.ErrorCode} | (${this.Pos.LineIndex + 1},${this.Pos.ColumnIndex + 1}) : ${this.Message}`;
        }
    }

    class ParsedError extends Info {
        constructor(pos: Position, length: number, message: string,code:number) {
            super(pos, length, message,code);
        }

        ToString(): string {
            return `Error | ${this.ErrorCode} | (${this.Pos.LineIndex + 1},${this.Pos.ColumnIndex + 1}) : ${this.Message}`;
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
                            IssueDuplicated(errLst, token, tokenStr, NODE_NAME);
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
                IssueInsufficientParameter(line, errLst, NODE_NAME);
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
                            IssueDuplicated(errLst, token, tokenStr, EDGE_NAME);
                        }
                        break;
                    case 2: {
                        source = nodeSet.TryGetValue(tokenStr);
                        if (source == null)
                        {
                            valid = false;
                            IssueNodeNotFound(errLst, token, tokenStr, "source");
                        }
                    }
                        break;
                    case 3: {
                        target = nodeSet.TryGetValue(tokenStr);
                        if (target == null){
                            valid = false;
                            IssueNodeNotFound(errLst, token, tokenStr, "target");
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
                IssueInsufficientParameter(line, errLst, EDGE_NAME);
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
                            IssueDuplicated(errLst, token, tokenStr, GROUP_NAME);
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
                    IssueInsufficientParameter(line, errLst, GROUP_NAME);
                }

                //TODO error recover from here: try find end group but this may lead to infinite look ahead!
                return null;
            }

            //assume following tokens are node ids until "endGroup" is meet
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

                if (token.Is(END_GROUP_NAME, netDslStr)) {
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
                        if (node.Group != gr){
                            errLst.Add(new ParsedError(token.Pos, token.Length,
                                `node ${tokenStr} already belong to another ${node.Group.Id}`,ERR_ANOTHER_GROUP));
                        }else{
                            errLst.Add(new Warning(token.Pos, token.Length,
                                `node ${tokenStr} already assign to ${node.Group.Id}`,WARN_DUPLICATE_ASSIGN_GROUP));
                        }
                    } else {
                        node.Group = gr;
                        NodeList.Add(node);
                    }
                } else {
                    IssueNodeNotFound(errLst, token, tokenStr, "group node");
                }
            }

            if (NodeList.Count == 0) {
                errLst.Add(new Warning(line.Pos, line.Length,
                    `group ${Id} contains no nodes and discarded`,WARN_GROUP_DISCARD));
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

    function IssueNodeNotFound(errLst: List<Info>, token: ParsedToken, tokenStr: string, ty: string)
    {
        errLst.Add(new ParsedError(token.Pos, token.Length, `${ty} ${tokenStr} not found`,ERR_NODE_NOT_FOUND));
    }

    function IssueNodeGroupConflict(errLst: List<Info>, token: ParsedToken, tokenStr: string) {
        errLst.Add(new ParsedError(token.Pos, token.Length, `group id conflicts with node id: ${tokenStr}`,ERR_ID_CONFLICT));
    }

    function IssueDuplicated(errLst: List<Info>, token: ParsedToken, tokenStr: string, ty: string): void {
        errLst.Add(new ParsedError(token.Pos, token.Length, `duplicated ${ty} ${tokenStr}`,ERR_DUPLICATED_ID));
    }

    function IssueInsufficientParameter(line: ParsedLine, errLst: List<Info>, ty: string): void {
        errLst.Add(new ParsedError(line.Pos, line.Length, `insufficient ${ty} parameter`,ERR_INSUFFICIENT_PARAM));
    }

    function IssueDiscardToken(errLst: List<Info>, token: ParsedToken, tokenStr: string): void {
        errLst.Add(new Warning(token.Pos, token.Length, `discard token ${tokenStr}`,WARN_TOKEN_DISCARD));
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
            yield new ParsedToken(line,start,index);
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
        const srcTargetSet = new TupleSet<Node>();
        let lastPos = new Position(0, 0);
        const tokenStream = new IEnumerator(ParseNetDslLines(netDslStr));
        while (tokenStream.MoveNext())
        {
            const token = tokenStream.Current;
            const line = token.Line;
            if (token.Is(NODE_NAME, netDslStr))
            {
                const node = Node.TryFindArgument(line, tokenStream, netDslStr, nodeSet,groupSet,errLst);
                if (node != null)
                {
                    nodeSet.Add(node.Id, node);
                }
                continue;
            }

            if (token.Is(EDGE_NAME, netDslStr))
            {
                const edge = Edge.TryFindArgument(line, tokenStream, netDslStr, nodeSet, edgeSet, errLst);
                if (edge != null)
                {
                    if (srcTargetSet.Contains(edge.Source, edge.Target))
                    {
                        errLst.Add(new Warning(line.Pos, line.Length,
                            `edge with same source and target already exist ${edge.Id}`,WARN_EDGE_SAME_SRC_TARGET));
                    }
                    srcTargetSet.Add(edge.Source, edge.Target);
                    edgeSet.Add(edge.Id, edge);
                }

                continue;
            }

            if (token.Is(GROUP_NAME, netDslStr))
            {
                const gr = Group.TryFindArgument(line, tokenStream, netDslStr, nodeSet, groupSet, errLst);
                if (gr != null)
                {
                    groupSet.Add(gr.Id, gr);
                }

                continue;
            }

            if (token.StartWith(COMMENT_PREFIX, netDslStr)){
                SkipLine(tokenStream);
                continue;
            }

            if (token instanceof EndOfLine || token instanceof EndOfFile)
            {
                if (token instanceof EndOfFile)
                    lastPos = token.Pos;
                continue;
            }

            SkipLine(tokenStream);
            errLst.Add(new ParsedError(line.Pos, line.Length,
                `unexpected ${token.GetString(netDslStr)}, expect node/edge/group..endGroup, discard whole line`
                ,ERR_INVALID_LINE_START));
        }

        const net = new Net(nodeSet.ValuesToArray(), edgeSet.ValuesToArray(), groupSet.ValuesToArray());
        if (errLst.Count != 0)
            return [net, errLst.ToArray()];

        const noError = new NoError(lastPos);
        return [net, [noError]];
    }

    export function GenerateGoJsModel(net: Net): GoJsModel {
        const nodes = new Array<GoJsNode>(net.NodeList.length + net.GroupList.length);
        const edgeNum = net.EdgeList.length;
        const edges = new Array<GoJsLink>(edgeNum);
        let index = 0;
        for (const node of net.NodeList) {
            //warning node.Label maybe empty
            nodes[index]=node.Group != null?{key: node.Id,group:node.Group.Id,text:node.Label} : {key: node.Id,text:node.Label};
            index++;
        }
        for (const gr of net.GroupList) {
            //warning gr.Label maybe empty
            nodes[index]={key: gr.Id,text:gr.Label, isGroup: true};
            index++;
        }
        index=0;
        for (const edge of net.EdgeList) {
            edges[index]={from:edge.Source.Id,to:edge.Target.Id};
            index++;
        }
        return new GoJsModel(nodes, edges);
    }
}
