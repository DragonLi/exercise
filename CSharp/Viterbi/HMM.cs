using System;
using System.Collections.Generic;
using System.Linq;

namespace Viterbi
{
    using ProbT = Double;
    /// <summary>
    /// Hidden Markov Model
    /// </summary>
    public abstract class HMM<THState,TObservation>
    {
        //init_prob: HState -> double
        public abstract ProbT InitProb(THState s);
        //transition prob function : HState -> HState -> double
        public abstract ProbT Trans(THState from, THState to);
        //emition prob function : HState -> Observation -> double
        public abstract ProbT EmitObs(THState s, TObservation obs);

        public Tuple<ProbT, THState[]> Viterbi(IEnumerable<THState> checkStates
            ,IEnumerable<TObservation> obsSeq,int seqSize)
        {
            var stateArr = checkStates.ToArray();
            var stateArrLength = stateArr.Length;
            var viterbiArr=new ProbT[stateArrLength];
            var vpath = new THState[seqSize];
            var time = 0;
            using (var em = obsSeq.GetEnumerator())
            {
                if (!em.MoveNext())
                    throw new Exception();
                var currentObs = em.Current;

                var maxHiddenState = default(THState);
                var maxHiddenVal = ProbT.MinValue;
                //possible vector parrell
                for (var i = 0; i < stateArrLength; i++)
                {
                    var hState = stateArr[i];
                    viterbiArr[i] = InitProb(hState) * EmitObs(hState, currentObs);
                    if (maxHiddenVal < viterbiArr[i])
                    {
                        maxHiddenVal = viterbiArr[i];
                        maxHiddenState = hState;
                    }
                }
                vpath[time] = maxHiddenState;
                time++;

                var tmpArr = new ProbT[stateArrLength];
                while (em.MoveNext())
                {
                    currentObs = em.Current;
                    maxHiddenState = default(THState);
                    maxHiddenVal = ProbT.MinValue;
                    //possible vector parrell
                    for (var i = 0; i < stateArrLength; i++)
                    {
                        var hState = stateArr[i];
                        //possible matrix parrell: max viterbiArr[j]*Trans(j,i)
                        var maxV = ProbT.MinValue;
                        for (var j = 0; j < stateArrLength; j++)
                        {
                            var tmp = viterbiArr[j] * Trans(stateArr[j], hState);
                            if (tmp > maxV)
                                maxV = tmp;
                        }
                        tmpArr[i] = maxV * EmitObs(hState, currentObs);
                        if (maxHiddenVal < tmpArr[i])
                        {
                            maxHiddenVal = tmpArr[i];
                            maxHiddenState = hState;
                        }
                    }
                    Array.Copy(tmpArr, viterbiArr, stateArrLength);
                    vpath[time] = maxHiddenState;
                    time++;
                }

                return Tuple.Create(maxHiddenVal, vpath);
            }
        }
    }

    public class Wrapper<T>
    {
        public T Value;
    }

    /// <summary>
    /// Finite Discrete State and observation
    /// </summary>
    /// <typeparam name="THState"></typeparam>
    /// <typeparam name="TObservation"></typeparam>
    public class FiniteHMM<THState,  TObservation> : HMM<THState, TObservation>
    {
        public IEnumerable<THState> Viterbi(IEnumerable<TObservation> obsSeq, Wrapper<ProbT> maxProb)
        {
            var stateArr = _stateArr;
            var stateArrLength = stateArr.Length;
            var viterbiArr=new ProbT[stateArrLength];
            using (var em = obsSeq.GetEnumerator())
            {
                if (!em.MoveNext())
                    throw new Exception();
                var currentObs = em.Current;
                    
                var maxHiddenState = default(THState);
                var maxHiddenVal = ProbT.MinValue;
                //possible vector parrell
                for (var i = 0; i < stateArrLength; i++)
                {
                    var hState = stateArr[i];
                    viterbiArr[i] = _initProb[i] * _emit(hState, currentObs);
                    if (maxHiddenVal < viterbiArr[i])
                    {
                        maxHiddenVal = viterbiArr[i];
                        maxHiddenState = hState;
                    }
                }

                if (maxProb!=null)
                    maxProb.Value = maxHiddenVal;
                yield return maxHiddenState;

                var tmpArr = new ProbT[stateArrLength];
                while (em.MoveNext())
                {
                    currentObs = em.Current;
                    maxHiddenState = default(THState);
                    maxHiddenVal = ProbT.MinValue;
                    //possible vector parrell
                    for (var i = 0; i < stateArrLength; i++)
                    {
                        var hState = stateArr[i];
                        //possible matrix parrell: max viterbiArr[j]*Trans(j,i)
                        var maxV = ProbT.MinValue;
                        for (var j = 0; j < stateArrLength; j++)
                        {
                            var tmp = viterbiArr[j] *_trans[j][i];
                            if (tmp > maxV)
                                maxV = tmp;
                        }
                        tmpArr[i] = maxV * _emit(hState, currentObs);
                        if (maxHiddenVal < tmpArr[i])
                        {
                            maxHiddenVal = tmpArr[i];
                            maxHiddenState = hState;
                        }
                    }
                    Array.Copy(tmpArr, viterbiArr, stateArrLength);
                    if (maxProb!=null)
                        maxProb.Value = maxHiddenVal;
                    yield return maxHiddenState;
                }
            }
        }

        //bifunction : HStateSize <-> [0 .. HStateSize-1]
        //HStateSize <-  [0 .. HStateSize-1]
        private THState[] _stateArr;
        //HStateSize  -> [0 .. HStateSize-1]
        private Dictionary<THState, int> _stateInd;
        
        private ProbT[] _initProb;
        private ProbT[][] _trans;
        private Func<THState, TObservation, ProbT> _emit;

        public FiniteHMM(int stateSize, Func<int,THState> stateMap
            ,Func<THState,ProbT> initProb
            ,Func<THState,THState,ProbT> trans
            ,Func<THState,TObservation,ProbT> emit
        )
        {
            _stateArr = new THState[stateSize];
            _initProb=new ProbT[stateSize];
            _stateInd=new Dictionary<THState, int>(stateSize);
            _trans=new ProbT[stateSize][];
            _emit = emit;
            
            for (var i = 0; i < stateSize; i++)
            {
                var s = stateMap(i);
                _stateArr[i] = s;
                _initProb[i] = initProb(s);
                _stateInd.Add(s,i);
                _trans[i]=new ProbT[stateSize];
                for (var j = 0; j < stateSize; j++)
                {
                    var next = stateMap(j);
                    _trans[i][j] = trans(s, next);
                }
            }
        }

        public override double InitProb(THState s)
        {
            return _initProb[_stateInd[s]];
        }

        public override double Trans(THState from, THState to)
        {
            return _trans[_stateInd[from]][_stateInd[to]];
        }

        public override double EmitObs(THState s, TObservation obs)
        {
            return _emit(s, obs);
        }
    }
}