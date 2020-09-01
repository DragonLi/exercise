using System;
using System.Collections.Generic;
using System.Text;

namespace HanoiTower
{
    class Program
    {
        static void Main(string[] args)
        {
            var num = 4;
            var start = 1;
            var end = 2;
            PrintList(HanoiRec(num, start, end));
            PrintList(HanoiIter(num, start, end));
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

        static List<(int, int)> HanoiRec(int num, int start, int end)
        {
            if (num <= 0) return new List<(int, int)>();//Continuation0
            var tmp = 6 - start - end;
            var s = HanoiRec(num - 1, start, tmp);
            s.Add((start,end));//Continuation1
            var t = HanoiRec(num - 1, tmp, end);
            s.AddRange(t);//Continuation2
            return s;
        }

        enum HanoiRecState
        {
            Continuation0,
            Continuation1,
            Continuation2,
        }

        static List<(int, int)> HanoiIter(int num, int start, int end)
        {
            var result = new List<(int, int)>();
            if (num <= 0) return result;
            
            var stack = new Stack<(int,int,int,HanoiRecState)>();
            var tag = HanoiRecState.Continuation0;
            stack.Push((num, start, end, HanoiRecState.Continuation1));
            --num;
            end = 6 - start - end;
            while (stack.Count > 0 || tag != HanoiRecState.Continuation2)
            {
                if (num <= 0)
                {
                    (num, start, end, tag) = stack.Pop();
                }
                else switch (tag)
                {
                    case HanoiRecState.Continuation0:
                        stack.Push((num, start, end, HanoiRecState.Continuation1));
                        --num;
                        end = 6 - start - end;
                        //tag = HanoiRecState.Continuation0;
                        break;
                    case HanoiRecState.Continuation1:
                        result.Add((start,end));
                        stack.Push((num, start, end, HanoiRecState.Continuation2));
                        --num;
                        start = 6 - start - end;
                        tag = HanoiRecState.Continuation0;
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