using System;
using System.Collections.Generic;
using System.Text;

namespace HanoiTower
{
    class Program
    {
        static void Main(string[] args)
        {
            var start = 1;
            var end = 2;
            for (var num = 0; num < 25; num++)
            {
                var baseLine = HanoiRec(num, start, end, new List<(int, int)>());
                Console.WriteLine($"finished: {num}-Rec");
                var test = HanoiIter(num, start, end);
                Console.WriteLine($"finished: {num}-Iter");
                if (!IsSameList(baseLine, test))
                {
                    Console.WriteLine($"bug at Num: {num}");
                    PrintList(baseLine);
                    PrintList(test);
                }
            }
        }

        static bool IsSameList(IReadOnlyList<(int,int)> a, IReadOnlyList<(int,int)> b)
        {
            if (a.Count != b.Count)
                return false;
            
            for (var i = 0; i < a.Count; i++)
            {
                if (a[i] != b[i])
                {
                    return false;
                }
            }

            return true;
        }

        static void PrintList<T>(IEnumerable<T> lst)
        {
            var b = new StringBuilder();
            foreach (var item in lst)
            {
                b.AppendLine(item.ToString());
            }
            Console.WriteLine(b);
        }

        static List<(int, int)> HanoiRec(int num, int start, int end, List<(int,int)> acc)
        {
            if (num <= 0) return acc;
            //Continuation0
            var tmp = 6 - start - end;
            //end 0
            var s = HanoiRec(num - 1, start, tmp, acc);
            //Continuation1
            s.Add((start,end));
            //end 1
            var t = HanoiRec(num - 1, tmp, end, acc);
            //Continuation2
            //end 2
            return t;
        }

        enum HanoiRecState
        {
            Continuation0,
            Continuation1,
            Continuation2,
        }

        static List<(int, int)> HanoiIter(int num, int start, int end)
        {
            var maxDepth = num;
            var result = new List<(int, int)>();
            var stack = new Stack<(int,int,int,HanoiRecState)>(maxDepth);
            var tag = HanoiRecState.Continuation0;
            while (stack.Count > 0 || tag != HanoiRecState.Continuation2)
            {
                if (num <= 0)
                {
                    if (stack.Count > 0)
                    {
                        (num, start, end, tag) = stack.Pop();
                    }
                    else
                    {
                        //stop the loop
                        tag = HanoiRecState.Continuation2;
                    }
                }
                else switch (tag)
                {
                    case HanoiRecState.Continuation0:
                        stack.Push((num, start, end, HanoiRecState.Continuation1));
                        --num;
                        end = 6 - start - end;
                        //tag = HanoiRecState.Continuation0;
                        if (maxDepth < stack.Count)
                        {
                            Console.WriteLine($"bug of maxDepth: {stack.Count}");
                        }
                        break;
                    case HanoiRecState.Continuation1:
                        result.Add((start,end));
                        stack.Push((num, start, end, HanoiRecState.Continuation2));
                        --num;
                        start = 6 - start - end;
                        tag = HanoiRecState.Continuation0;
                        if (maxDepth < stack.Count)
                        {
                            Console.WriteLine($"bug of maxDepth: {stack.Count}");
                        }
                        break;
                    default:
                        //tag == HanoiRecState.Continuation2
                        (num, start, end, tag) = stack.Pop();
                        break;
                }
            }

            return result;
        }
    }
}