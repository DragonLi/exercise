using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;

namespace QuickSort
{
    class Program
    {
        static void Main(string[] args)
        {
            Test(10000,500);
        }

        private static Random rgen = new Random();
        static void Test(int testNum,int size)
        {
            var tcase = new byte[size];
            var cases = new int[size];
            var passedCount = 0;
            for (int i = 0; i < testNum; i++)
            {
                rgen.NextBytes(tcase);
                for (int j = 0; j < size; j++)
                {
                    cases[j] = tcase[j];
                }

                //cases = new[] {206, 50, 110, 60, 200};
                if (TestCase(cases))
                    passedCount++;
            }
            if (passedCount != testNum)
                Console.WriteLine($"some test failed, passedCount: {passedCount}");
            else
                Console.WriteLine("pass test");
        }

        static bool TestCase(int[] cases)
        {
            var copy = new List<int>(cases);
            copy.Sort();
            //Qsort(cases);
            HeapSort(cases);
            var passed = true;
            for (int i = 0; i < copy.Count; i++)
            {
                if (copy[i] != cases[i])
                {
                    passed = false;
                    Console.Write($"failed at {i}, ");
                }
            }
            if (!passed)
                Console.WriteLine();

            return passed;
        }

        //in-place sort
        static void Qsort(int[] arr)
        {
            var cnt = arr.Length;
            if (cnt <= 0) return;
            Qsort(arr, 0, cnt - 1);
        }

        static void Qsort(int[] arr, int low, int high)
        {
            if (high <= low)
                return;
            
            //select pivot
            var pivotIdx = low + rgen.Next(high - low);
            
            //in-place partition by pivot
            pivotIdx = Partition(arr, low, high, pivotIdx);
            //pivotIdx = Partition2(arr, low, high, pivotIdx);
            //pivotIdx = Partition3(arr, low, high, pivotIdx);

            //sort the two partition recursively
            Qsort(arr, low, pivotIdx - 1);
            Qsort(arr, pivotIdx + 1, high);
        }

        static int Partition(int[] arr, int low, int high, int pivotIdx)
        {
            // low <= pivotIdx <= high
            var pivot = arr[pivotIdx];
            
            //switch arr[pivotIdx] and arr[high]
            arr[pivotIdx] = arr[high];
            //backup high for reinsert back pivot
            pivotIdx = high;
            //skip arr[high] since this place is reserved to store pivot
            high--;
            
            //[original low, low) <= pivot <= (high, original high] 
            while (low <= high)
            {
                while (low <= high && arr[low] <= pivot)
                {
                    low++;
                }
                while (low <= high && pivot <= arr[high])
                {
                    high--;
                }

                if (low <= high)
                {
                    // arr[low] > pivot and pivot > arr[high]
                    // low != high because if low == high then arr[low] == arr[high] > < pivot which is not possible
                    // switch arr[low] and arr[high]
                    /*var tmp = arr[low];
                    arr[low] = arr[high];
                    arr[high] = tmp;*/
                    Swap(ref arr[low],ref arr[high]);
                    // prepare to compare next
                    high--;
                    low++;
                }
            }
            // exit loop with [original low, low) <= pivot <= (high, original high] and low > high
            // all elements are compared to pivot
            // exit after all three branch means low = high + 1
            // need to insert pivot back to arrary and return to caller
            // choose low = high + 1
            arr[pivotIdx] = arr[low];
            arr[low] = pivot;

            pivotIdx = low;
            return pivotIdx;
        }
        
        static int Partition2(int[] arr, int low, int high, int pivotIdx)
        {
            // low <= pivotIdx <= high
            var pivot = arr[pivotIdx];
            
            //switch arr[pivotIdx] and arr[high]
            arr[pivotIdx] = arr[high];
            //backup high for reinsert back pivot
            pivotIdx = high;
            //skip arr[high] since this place is reserved to store pivot
            high--;

            var testRight = false;
            //loop invariant: [original low, low) <= pivot <= (high, original high] 
            while (low <= high)
            {
                if (!testRight && arr[low] <= pivot)
                {
                    low++;
                }else
                if (pivot <= arr[high])
                {
                    high--;
                    if (!testRight)
                        testRight = true;
                }else //if (low <= high)
                {
                    // arr[low] > pivot and pivot > arr[high]
                    // low != high because if low == high then arr[low] == arr[high] > < pivot which is not possible
                    // switch arr[low] and arr[high]
                    /*var tmp = arr[low];
                    arr[low] = arr[high];
                    arr[high] = tmp;*/
                    Swap(ref arr[low],ref arr[high]);
                    // prepare to compare next
                    high--;
                    low++;
                    testRight = false;
                }
            }
            // exit loop with [original low, low) <= pivot <= (high, original high] and low > high
            // all elements are compared to pivot
            // exit after all three branch means low = high + 1
            // need to insert pivot back to arrary and return to caller
            // choose low = high + 1
            arr[pivotIdx] = arr[low];
            arr[low] = pivot;

            pivotIdx = low;
            return pivotIdx;
        }
        
        static int Partition3(int[] arr, int low, int high, int pivotIdx)
        {
            // low <= pivotIdx <= high
            var pivot = arr[pivotIdx];
            
            //switch arr[pivotIdx] and arr[high]
            arr[pivotIdx] = arr[high];
            //backup high for reinsert back pivot
            pivotIdx = high;
            
            //skip arr[high] since this place is reserved to store pivot
            low = ScanArray(arr, pivot, low, high - 1, false);
            
            // exit loop with [original low, low) <= pivot <= (high, original high] and low > high
            // all elements are compared to pivot
            // exit after all three branch means low = high + 1
            // need to insert pivot back to arrary and return to caller
            // choose low = high + 1
            arr[pivotIdx] = arr[low];
            arr[low] = pivot;

            pivotIdx = low;
            return pivotIdx;
        }

        //loop invariant: [original low, low) <= pivot <= (high, original high]
        //loop invaraint become induction hyperthesis
        //return the first element index of right segment
        static int ScanArray(int[] arr, int pivot,
            int low, int high, bool testRight)
        {
            if (low <= high)
            {
                if (!testRight && arr[low] <= pivot)
                {
                    return ScanArray(arr, pivot, low+1, high, false);
                }
                else if (pivot <= arr[high])
                {
                    return ScanArray(arr, pivot, low, high-1, true);
                }
                else
                {
                    /*var tmp = arr[low];
                    arr[low] = arr[high];
                    arr[high] = tmp;*/
                    Swap(ref arr[low],ref arr[high]);
                    return ScanArray(arr, pivot, low+1, high-1, false);
                }
            }
            return low;
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        static void Swap(ref int x, ref int y)
        {
            var tmp = x;
            x = y;
            y = tmp;
        }

        static void HeapSort(int[] arr)
        {
            var end = arr.Length - 1;
            BuildHeap(arr, end);
            
            //loop invariant: arr[0,end] is heap arrary,(end,arr.Length -1] is sorted
            while (end > 0)
            {
                Swap(ref arr[0],ref arr[end]);
                end--;
                SiftDown(arr, 0, end);
            }
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        static int ParentBinHeap(int ind)
        {
            return (ind - 1) / 2;//shift right
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        static int LeftChildBinHeap(int ind)
        {
            return 2 * ind + 1;//shift left then add 1
        }
        
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        static int RightChildBinHeap(int ind)
        {
            return 2 * (ind + 1);//add 1 then shift left
        }
        
        /// <summary>
        /// O(n), where n = last+1
        /// </summary>
        /// <param name="arr"></param>
        /// <param name="last"></param>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        static void BuildHeap(int[] arr,int last)
        {
            var start = ParentBinHeap(last);
            //loop count is floor((last -1) / 2) +1
            //every loop execution is log (last - start +1)
            //
            while (start >= 0)
            {
                SiftDown(arr, start, last);
                start--;
            }
        }

        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        static int LeafSearch(int[] arr, int start, int end)
        {
            var j = start;
            while (RightChildBinHeap(j) <= end)
            {
                if (arr[RightChildBinHeap(j)] > arr[LeftChildBinHeap(j)])
                    j = RightChildBinHeap(j);
                else
                    j = LeftChildBinHeap(j);
            }

            if (LeftChildBinHeap(j) <= end)
                j = LeftChildBinHeap(j);
            
            return j;
        }
        
        /// <summary>
        /// O(log n), where n = end - start + 1
        /// </summary>
        /// <param name="arr"></param>
        /// <param name="start"></param>
        /// <param name="end"></param>
        static void SiftDown(int[] arr, int start, int end)
        {
            var j = LeafSearch(arr, start, end);
            while (arr[start] > arr[j])
                j = ParentBinHeap(j);

            var x = arr[j];
            arr[j] = arr[start];
            
            while (j > start)
            {
                j = ParentBinHeap(j);
                Swap(ref arr[j],ref x);
            }
        }
    }
    
}