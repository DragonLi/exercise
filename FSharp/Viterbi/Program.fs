// Learn more about F# at http://fsharp.org
// See the 'F# Tutorial' project for more help.

(* Nick Heiner *)

(* Viterbi algorithm, as described here: http://people.ccmr.cornell.edu/~ginsparg/INFO295/vit.pdf

  priorProbs: prior probability of a hidden state occuring
  transitions: probability of one hidden state transitioning into another
  emissionProbs: probability of a hidden state emitting an observed state
  observation: a sequence of observed states
  hiddens: a list of all possible hidden states

  Returns: probability of most likely path * hidden state list representing the path

*)
let viterbi (priorProbs : 'hidden -> float) (transitions : ('hidden * 'hidden) -> float) (emissionProbs : (('observed * 'hidden) -> float))
  (observation : 'observed []) (hiddens : 'hidden list) : float * 'hidden list =

  (* Referred to as v_state(time) in the notes *)
  (* Probability of the most probable path ending in state at time *)
  let rec mostLikelyPathProb (state : 'hidden) (time : int) : float * 'hidden list =
    let emission = emissionProbs (observation.[time], state)
    match time with 
      (* If we're at time 0, then just use the emission probability and the prior probability for this state *)
      | 0 -> emission * priorProbs state, [state]

      (* If we're not at time 0, then recursively look for the most likely path ending at this time *)
      | t when t > 0 ->
          let prob, path = Seq.maxBy fst (seq { for hiddenState in hiddens -> 
                                                (* Recursively look for most likely path at t - 1 *)
                                                let prob, path = mostLikelyPathProb hiddenState (time - 1)
                                                (* Rate each path by how likely it is to transition into the current state *)
                                                transitions (List.head path, state) * prob, path})
          emission * prob, state::path

      (* If time is < 0, then throw an error *)
      | _ -> failwith "time must be >= 0"

  (* Look for the most likely path that ends at t_max *)
  let prob, revPath = Seq.maxBy fst (seq { for hiddenState in hiddens -> mostLikelyPathProb hiddenState ((Array.length observation) - 1)}) 
  prob, List.rev revPath

(* example using data from this article: *)
type wikiHiddens = Healthy | Fever
let wikiHiddenList = [Healthy; Fever]
type wikiObservations = Normal | Cold | Dizzy

let wikiPriors = function
  | Healthy -> 0.6
  | Fever -> 0.4

let wikiTransitions = function
  | (Healthy, Healthy) -> 0.7
  | (Healthy, Fever) -> 0.3
  | (Fever, Healthy) -> 0.4
  | (Fever, Fever) -> 0.6

let wikiEmissions = function
  | (Cold, Healthy) -> 0.4
  | (Normal, Healthy) -> 0.5
  | (Dizzy, Healthy) -> 0.1
  | (Cold, Fever) -> 0.3
  | (Normal, Fever) -> 0.1
  | (Dizzy, Fever) -> 0.6


[<EntryPoint>]
let main argv =
    let testInput = [| Dizzy; Normal; Cold |]
    let testresult = viterbi wikiPriors wikiTransitions wikiEmissions testInput wikiHiddenList
    printfn "%A" testresult
    0 // return an integer exit code
