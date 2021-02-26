using System;
using System.IO;

namespace ParseNetDSL
{
    internal static class Program
    {
        private static void Main(string[] args)
        {
            using var fs = File.OpenText(args[0]);
            var netDslStr = fs.ReadToEnd();
            var (net,errLst) = NetDslParser.Parse(netDslStr);
            var model = NetDslParser.GenerateGoJsModel(net);

            foreach (var errInfo in errLst)
            {
                Console.WriteLine(errInfo);
            }
            Console.WriteLine();
            foreach (var node in net.NodeList)
            {
                Console.WriteLine(node);
            }
            foreach (var edge in net.EdgeList)
            {
                Console.WriteLine(edge);
            }
            foreach (var sub in net.GroupList)
            {
                Console.WriteLine(sub);
                foreach (var node in sub.NodeList)
                {
                    Console.WriteLine(node.Id);
                }
                Console.WriteLine("endgroup");
            }
            Console.WriteLine();
            Console.WriteLine(model.GoJsNodeDataArrayStr);
            Console.WriteLine(model.GoJsNodeLinkArrayStr);
        }

    }

}