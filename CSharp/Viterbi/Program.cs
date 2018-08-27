using System;

namespace Viterbi
{
    enum wikiHiddens
    {
        Healthy , Fever
    }

    enum wikiObservations
    {
        Normal , Cold , Dizzy
    }
    
    class Program
    {
        static void Main(string[] args)
        {
            var hmm =new FiniteHMM<wikiHiddens, wikiObservations>(
                2,
                i => (wikiHiddens)i,
                hiddens =>
                {
                    switch (hiddens)
                    {
                        case wikiHiddens.Healthy:
                            return 0.6;
                        case wikiHiddens.Fever:
                            return 0.4;
                        default:
                            throw new ArgumentOutOfRangeException(nameof(hiddens), hiddens, null);
                    }
                },
                (hiddens, wikiHiddens) =>
                {
                    switch (hiddens)
                    {
                        case wikiHiddens.Healthy:
                            switch (wikiHiddens)
                            {
                                case wikiHiddens.Healthy:
                                    return 0.7;
                                case wikiHiddens.Fever:
                                    return 0.3;
                            }
                            break;
                        case wikiHiddens.Fever:
                            switch (wikiHiddens)
                            {
                                case wikiHiddens.Healthy:
                                    return 0.4;
                                case wikiHiddens.Fever:
                                    return 0.6;
                            }
                            break;
                    }
                    throw new ArgumentOutOfRangeException(nameof(hiddens), hiddens, null);
                },
                (hiddens, observations) =>
                {
                    switch (hiddens)
                    {
                        case wikiHiddens.Healthy:
                            switch (observations)
                            {
                                case wikiObservations.Normal:
                                    return 0.5;
                                case wikiObservations.Cold:
                                    return 0.4;
                                case wikiObservations.Dizzy:
                                    return 0.1;
                            }
                            break;
                        case wikiHiddens.Fever:
                            switch (observations)
                            {
                                case wikiObservations.Normal:
                                    return 0.1;
                                case wikiObservations.Cold:
                                    return 0.3;
                                case wikiObservations.Dizzy:
                                    return 0.6;
                            }
                            break;
                    }
                    throw new ArgumentOutOfRangeException(nameof(observations), observations, null);
                });
            var outMaxProb = new Wrapper<double>();
            var result = hmm.Viterbi(new []
            {
                wikiObservations.Normal, 
                wikiObservations.Cold,
                wikiObservations.Dizzy, 
            }, outMaxProb);
            
            foreach (var hiddense in result)
            {
                Console.Write(hiddense+", ");
            }
            Console.Write(outMaxProb.Value+"");
            Console.WriteLine();
            
            outMaxProb.Value = 0;
            var emitArr = new[] {new[] {0.5,0.4,0.1}, new[] {0.1,0.3,0.6}};
            result = hmm.Viterbi(new []
            {
                (int) wikiObservations.Normal, 
                (int) wikiObservations.Cold,
                (int) wikiObservations.Dizzy, 
            },emitArr, outMaxProb);
            foreach (var hiddense in result)
            {
                Console.Write(hiddense+", ");
            }
            Console.Write(outMaxProb.Value+"");
            Console.WriteLine();
        }
    }
}