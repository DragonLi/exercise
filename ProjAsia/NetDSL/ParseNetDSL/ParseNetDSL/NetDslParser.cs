using System.Collections.Generic;
using System.Text;

namespace ParseNetDSL
{
    public static class NetDslParser
    {
        public class GoJsModel
        {
            public GoJsModel(string[] nodeArray, string[] linkArray)
            {
                NodeArray = nodeArray;
                LinkArray = linkArray;
            }

            public string[] NodeArray { get; }
            public string[] LinkArray { get; }

            public string GoJsNodeDataArrayStr
            {
                get
                {
                    var sb = new StringBuilder();
                    sb.Append('[').AppendLine();
                    foreach (var str in NodeArray)
                    {
                        sb.AppendLine(str);
                    }
                    sb.Append(']').AppendLine();
                    return sb.ToString();
                }
            }

            public string GoJsNodeLinkArrayStr
            {
                get
                {
                    var sb = new StringBuilder();
                    sb.Append('[').AppendLine();
                    foreach (var str in LinkArray)
                    {
                        sb.AppendLine(str);
                    }
                    sb.Append(']').AppendLine();
                    return sb.ToString();
                }
            }
        }
        public static GoJsModel GenerateGoJsModel(Net net)
        {
            var nodes = new string[net.NodeList.Length + net.GroupList.Length];
            var edges = new string[net.EdgeList.Length];
            var index = 0;
            foreach (var node in net.NodeList)
            {
                nodes[index] = node.GoJsStr;
                index++;
            }
            foreach (var gr in net.GroupList)
            {
                nodes[index] = gr.GoJsStr;
                index++;
            }
            for (index = 0; index < net.EdgeList.Length; index++)
            {
                edges[index] = net.EdgeList[index].GoJsStr;
            }

            return new GoJsModel(nodes, edges);
        }
        public class Position
        {
            public Position(int lineIndex, int columnIndex)
            {
                LineIndex = lineIndex;
                ColumnIndex = columnIndex;
            }

            public int LineIndex { get; }
            public int ColumnIndex { get; }
        }
        public class Info
        {
            public Info(Position pos, int length, string message)
            {
                Pos = pos;
                Length = length;
                Message = message;
            }

            public override string ToString()
            {
                return $"({Pos.LineIndex + 1},{Pos.ColumnIndex + 1}) | Info: {Message}";
            }

            public Position Pos { get; }
            public int Length { get; }
            public string Message { get; }
        }

        public class NoError : Info
        {
            public NoError(Position pos) : base(pos, 0,string.Empty)
            {
            }

            public override string ToString()
            {
                return "Success";
            }
        }
        
        public class Warning : Info
        {
            public Warning(Position pos, int length, string message) : base(pos, length, message)
            {
            }
            public override string ToString()
            {
                return $"({Pos.LineIndex + 1},{Pos.ColumnIndex + 1}) | Warning: {Message}";
            }
        }
        
        public class ParsedError : Info
        {
            public ParsedError(Position pos, int length, string message) : base(pos, length, message)
            {
            }
            public override string ToString()
            {
                return $"({Pos.LineIndex + 1},{Pos.ColumnIndex + 1}) | Error: {Message}";
            }
        }
        
        public class Net
        {
            public Net(Node[] nodeList, Edge[] edgeList, Group[] groupList)
            {
                NodeList = nodeList;
                EdgeList = edgeList;
                GroupList = groupList;
            }

            public Node[] NodeList { get; }
            public Edge[] EdgeList { get; }
            public Group[] GroupList { get; }
        }
        
        public static (Net net, Info[] errLst) Parse(string netDslStr)
        {
            var errLst = new List<Info>();
            var nodeSet = new Dictionary<string, Node>();
            var edgeSet = new Dictionary<string, Edge>();
            var groupSet = new Dictionary<string, Group>();
            var srcTargetSet = new HashSet<(Node, Node)>();
            var lastPos = new Position(0, 0);
            using (var tokenStream = ParseNetDslLines(netDslStr).GetEnumerator())
            {
                while (tokenStream.MoveNext())
                {
                    var token = tokenStream.Current;
                    if (token is EndOfLine || token is EndOfFile)
                    {
                        if (token is EndOfFile)
                            lastPos = token.Pos;
                        continue;
                    }

                    var line = token.Line;
                    if (token.Is("node", netDslStr))
                    {
                        var node = new Node();
                        if (node.TryFindArgument(line, tokenStream, netDslStr, nodeSet,groupSet,errLst))
                        {
                            nodeSet.Add(node.Id, node);
                        }

                        continue;
                    }

                    if (token.Is("edge", netDslStr))
                    {
                        var edge = new Edge();
                        if (edge.TryFindArgument(line, tokenStream, netDslStr, nodeSet, edgeSet,errLst))
                        {
                            var pair = (edge.Source, edge.Target);
                            if (srcTargetSet.Contains(pair))
                            {
                                errLst.Add(new Warning(line.Pos, line.Length,
                                    $"edge with same source and target already exist {edge.Id}"));
                            }

                            srcTargetSet.Add(pair);
                            edgeSet.Add(edge.Id, edge);
                        }

                        continue;
                    }

                    if (token.Is("group", netDslStr))
                    {
                        var gr = new Group();
                        if (gr.TryFindArgument(line, tokenStream, netDslStr, nodeSet, groupSet,errLst))
                        {
                            groupSet.Add(gr.Id, gr);
                        }

                        continue;
                    }
                    errLst.Add(new ParsedError(line.Pos, line.Length,
                        "expect node/edge/group..endgroup"));
                }
            }

            var net = new Net(ToArray(nodeSet), ToArray(edgeSet), ToArray(groupSet));
            if (errLst.Count != 0) return (net, errLst.ToArray());
            
            Info noError = new NoError(lastPos);
            return (net, new[] {noError});
        }

        private static T[] ToArray<T>(Dictionary<string, T> dict)
        {
            var result = new T[dict.Count];
            var index = 0;
            foreach (var val in dict.Values)
            {
                result[index] = val;
                index++;
            }
            return result;
        }

        private static IEnumerable<ParsedToken> ParseNetDslLines(string netDslStr)
        {
            var index = 0;
            var start = 0;
            var line = new ParsedLine();
            for (var max = netDslStr.Length; index < max; index++)
            {
                var ch = netDslStr[index];
                if (!char.IsWhiteSpace(ch)) continue;
                //estimate line length
                if (index > start)
                {
                    yield return new ParsedToken()
                    {
                        Line = line,
                        EndExclusive = index,
                        Start = start
                    };
                }

                switch (ch)
                {
                    case '\n':
                        line.Length = index - line.Start;
                        yield return new EndOfLine()
                        {
                            Line = line,
                            Start = index,
                            EndExclusive = index + 1
                        };
                        line = new ParsedLine
                        {
                            Index = line.Index + 1,
                            Start = index + 1
                        };
                        break;
                    case '\r':
                    {
                        start = index;
                        if (index + 1 < max && netDslStr[index + 1] == '\n')
                        {
                            index++;
                        }

                        line.Length = start - line.Start;
                        yield return new EndOfLine()
                        {
                            Line = line,
                            Start = start,
                            EndExclusive = index + 1
                        };
                        line = new ParsedLine
                        {
                            Index = line.Index + 1,
                            Start = index + 1
                        };
                        break;
                    }
                }

                //skip following whitespace except line break
                var i = index + 1;
                for (;
                    i < max && (ch=netDslStr[i]) != '\n' && ch != '\r'
                    && char.IsWhiteSpace(ch);
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
                yield return new ParsedToken()
                {
                    Line = line,
                    EndExclusive = index,
                    Start = start
                };
                start = index;
            }
            //generate end of file
            yield return new EndOfFile()
            {
                Line = line,
                Start = start,
                EndExclusive = start
            };
        }

        internal class ParsedLine
        {
            public int Index;
            public int Start;
            public int Length;

            public Position Pos => new Position(Index, 0);
        }

        internal class ParsedToken
        {
            internal ParsedLine Line;
            public int Start;
            public int EndExclusive;

            public Position Pos => new Position(Line.Index,Start - Line.Start);
            public int Length => EndExclusive - Start;

            public bool Is(string name, string netDslStr)
            {
                var len = name.Length;
                if (EndExclusive - Start != len)
                {
                    return false;
                }

                for (var index = 0; index < len; index++)
                {
                    var ch = name[index];
                    if (ch != char.ToLower(netDslStr[index + Start]))
                    {
                        return false;
                    }
                }

                return true;
            }

            public string GetString(string netDslStr)
            {
                return netDslStr.Substring(Start, EndExclusive - Start);
            }
        }

        private class EndOfLine : ParsedToken
        {
            
        }
        
        private class EndOfFile : ParsedToken
        {
            
        }

        public class Node
        {
            public string Id { get; private set; }
            public string Label{ get; private set; }
            public Group Group{ get; internal set; }
            public string GoJsStr => "{key:\"" + Id + "\"}";

            public override string ToString()
            {
                return $"Node {nameof(Id)}: {Id}, {nameof(Label)}: {Label}, {Group}";
            }

            internal bool TryFindArgument(ParsedLine line, IEnumerator<ParsedToken> tokenStream
                , string netDslStr, Dictionary<string, Node> nodeSet
                , Dictionary<string, Group> groupSet, List<Info> errLst)
            {
                var count = 0;
                var valid = true;
                while (tokenStream.MoveNext())
                {
                    var token = tokenStream.Current;
                    if (token is EndOfLine || token is EndOfFile)
                    {
                        break;
                    }
                    count++;
                    var tokenStr = token.GetString(netDslStr);
                    switch (count)
                    {
                        case 1:
                            Id = tokenStr;
                            if (nodeSet.ContainsKey(tokenStr))
                            {
                                valid = false;
                                IssueDuplicated(errLst, token, tokenStr, "node");
                            }

                            if (groupSet.ContainsKey(tokenStr))
                            {
                                valid = false;
                                IssueNodeGroupConflict(errLst, token, tokenStr);
                            }
                            break;
                        case 2:
                            Label = tokenStr;
                            break;
                        default:
                        {
                            IssueDiscardToken(errLst, token, tokenStr);
                            break;
                        }
                    }
                }

                if (count < 1)
                {
                    IssueInsufficientParameter(line, errLst,"node");
                }
                return valid && count >= 1;
            }
        }

        //TODO define another data structure "delay edge" to support delay checking of nodes
        public class Edge
        {
            public string Id{ get; private set; }
            public Node Source{ get; private set; }

            public Node Target{ get; private set; }

            public string Label{ get; private set; }
            public string GoJsStr => "{from: \"" + Source.Id + "\", to: \"" + Target.Id + "\"}";

            public override string ToString()
            {
                return $"Edge {nameof(Id)}: {Id}, {nameof(Source)}: {Source.Id}, {nameof(Target)}: {Target.Id}, {nameof(Label)}: {Label}";
            }

            internal bool TryFindArgument(ParsedLine line, IEnumerator<ParsedToken> tokenStream, string netDslStr,
                Dictionary<string, Node> nodeSet, Dictionary<string, Edge> edgeSet, List<Info> errLst)
            {
                var count = 0;
                var valid = true;
                while (tokenStream.MoveNext())
                {
                    var token = tokenStream.Current;
                    if (token is EndOfLine || token is EndOfFile)
                    {
                        break;
                    }

                    count++;
                    var tokenStr = token.GetString(netDslStr);
                    switch (count)
                    {
                        case 1:
                            Id = tokenStr;
                            if (edgeSet.ContainsKey(tokenStr))
                            {
                                valid = false;
                                IssueDuplicated(errLst, token, tokenStr, "edge");
                            }
                            break;
                        case 2:
                        {
                            if (!nodeSet.TryGetValue(tokenStr, out var tmp))
                            {
                                valid = false;
                                IssueNodeNotFound(errLst, token, tokenStr, "source");
                            }
                            Source = tmp;
                        }
                            break;
                        case 3:
                        {
                            if (!nodeSet.TryGetValue(tokenStr, out var tmp))
                            {
                                valid = false;
                                IssueNodeNotFound(errLst, token, tokenStr, "target");
                            }

                            Target = tmp;
                        }
                            break;
                        case 4:
                            Label = tokenStr;
                            break;
                        default:
                        {
                            IssueDiscardToken(errLst, token, tokenStr);
                            break;
                        }
                    }
                }
                
                if (count < 3)
                {
                    IssueInsufficientParameter(line, errLst,"edge");
                }
                return valid && count >= 3;
            }
        }

        //TODO define another data structure "delay group" to support delay checking of nodes
        public class Group
        {
            public string Id{ get; private set; }
            public string Label{ get; private set; }
            public List<Node> NodeList{ get; private set; }
            public string GoJsStr => "{key:\"" + Id + "\", isGroup: true}";

            public override string ToString()
            {
                return $"Group {nameof(Id)}: {Id}, {nameof(Label)}: {Label}";
            }

            internal bool TryFindArgument(ParsedLine line, IEnumerator<ParsedToken> tokenStream, string netDslStr,
                Dictionary<string, Node> nodeSet, Dictionary<string, Group> groupSet, List<Info> errLst)
            {
                var count = 0;
                var valid = true;
                while (tokenStream.MoveNext())
                {
                    var token = tokenStream.Current;
                    if (token is EndOfLine || token is EndOfFile)
                    {
                        break;
                    }

                    count++;
                    var tokenStr = token.GetString(netDslStr);
                    switch (count)
                    {
                        case 1:
                            Id = tokenStr;
                            if (groupSet.ContainsKey(tokenStr))
                            {
                                valid = false;
                                IssueDuplicated(errLst, token, tokenStr, "group");
                            }
                            if (nodeSet.ContainsKey(tokenStr))
                            {
                                valid = false;
                                IssueNodeGroupConflict(errLst, token, tokenStr);
                            }
                            break;
                        case 2:
                            Label = tokenStr;
                            break;
                        default:
                        {
                            IssueDiscardToken(errLst, token, tokenStr);
                            break;
                        }
                    }
                }

                if (!(valid && count >= 1))
                {
                    if (count < 1)
                    {
                        IssueInsufficientParameter(line, errLst,"group");
                    }

                    NodeList = new List<Node>(0);
                    return false;
                }

                //assume following tokens are node ids until "endgroup" is meet
                NodeList = new List<Node>();
                var endGroup = false;

                while (tokenStream.MoveNext())
                {
                    var token = tokenStream.Current;
                    if (token is EndOfFile)
                    {
                        break;
                    }
                    
                    if (token is EndOfLine)
                        continue;

                    if (token.Is("endgroup", netDslStr))
                    {
                        endGroup = true;
                        //skip tokens in the same line
                        while (tokenStream.MoveNext())
                        {
                            token = tokenStream.Current;
                            if (token is EndOfLine || token is EndOfFile)
                            {
                                break;
                            }
                            IssueDiscardToken(errLst,token,token.GetString(netDslStr));
                        }
                        break;
                    }

                    var tokenStr = token.GetString(netDslStr);
                    if (nodeSet.TryGetValue(tokenStr, out var node))
                    {
                        if (node.Group != null)
                        {
                            errLst.Add(new Warning(token.Pos, token.Length,
                                $"node {tokenStr} already belong to another {node.Group.Id}"));
                        }
                        else
                        {
                            node.Group = this;
                            NodeList.Add(node);
                        }
                    }
                    else
                    {
                        IssueNodeNotFound(errLst, token, tokenStr, "group node");
                    }
                }

                if (NodeList.Count == 0)
                {
                    errLst.Add(new Warning(line.Pos, line.Length, 
                        $"group {Id} contains no nodes and is removed"));
                }
                else
                {
                    NodeList.TrimExcess();
                }

                if (!endGroup)
                {
                    foreach (var node in NodeList)
                    {
                        node.Group = null;
                    }
                }
                return endGroup && NodeList.Count > 0;
            }
        }

        private static void IssueNodeNotFound(List<Info> errLst, ParsedToken token, string tokenStr, string ty)
        {
            errLst.Add(new ParsedError(token.Pos, token.Length, $"{ty} {tokenStr} don't exist"));
        }

        private static void IssueNodeGroupConflict(List<Info> errLst, ParsedToken token, string tokenStr)
        {
            errLst.Add(new ParsedError(token.Pos, token.Length, $"group id conflicts with node id: {tokenStr}"));
        }

        private static void IssueDuplicated(List<Info> errLst, ParsedToken token, string tokenStr, string ty)
        {
            errLst.Add(new ParsedError(token.Pos, token.Length, $"duplicated {ty} {tokenStr}"));
        }

        private static void IssueInsufficientParameter(ParsedLine line, List<Info> errLst, string ty)
        {
            errLst.Add(new ParsedError(line.Pos, line.Length, $"insufficient {ty} parameter"));
        }

        private static void IssueDiscardToken(List<Info> errLst, ParsedToken token, string tokenStr)
        {
            errLst.Add(new Warning(token.Pos, token.Length, $"discard token {tokenStr}"));
        }
    }
}