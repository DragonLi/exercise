let rec HanoiTowerRec n s f =
    match n with
    | m when m <= 0 -> []
    | _ ->
        let t = 6 - s - f
        (HanoiTowerRec (n - 1) s t) @ [ s, f ] @ (HanoiTowerRec (n - 1) t f)

type HanoiRecState =
    | Continuation0
    | Continuation1
    | Continuation2

let rec HanoiTowerRev n s f accLst instructions (tag: HanoiRecState) =
    match tag, instructions, n with
    // stack.Count ==0 && tag == continuation2
    | HanoiRecState.Continuation2, [], _ -> accLst
    // num <= 0 && stack.Count == 0
    | _, [], m when m <= 0 -> accLst
    // num <=0 %% stack.Count > 0
    | _, (tNum, tStart, tEnd, oldTag) :: left, 0 ->
        HanoiTowerRev tNum tStart tEnd accLst left oldTag
    // num > 0 && tag == 0
    | HanoiRecState.Continuation0, _, _ ->
        HanoiTowerRev (n - 1) s (6 - s - f) accLst ((n, s, f, HanoiRecState.Continuation1) :: instructions) tag
    // num > 0 && tag == 1
    | HanoiRecState.Continuation1, _, _ ->
        HanoiTowerRev (n - 1) (6 - s - f) f ((s, f) :: accLst) ((n, s, f, HanoiRecState.Continuation2) :: instructions)
            HanoiRecState.Continuation0
    // num > 0 && tag == 2: in this case, stack must not be empty or there is bug presented! Yet compiler can check the completeness of pattern matching so this bug does not exist by the compiler!
    | HanoiRecState.Continuation2, (tNum, tStart, tEnd, oldTag) :: left, _ ->
        HanoiTowerRev tNum tStart tEnd accLst left oldTag

let HanoiTowerTailRecursive n s f = HanoiTowerRev n s f [] [] HanoiRecState.Continuation0 |> List.rev

let testResult (b: (int * int) list) (t: (int * int) list) =
    if (b.Length <> t.Length)
    then false
    else List.zip b t |> List.forall (fun (x, y) -> x = y)


[<EntryPoint>]
let main argv =
    [ 0 .. 20 ]
    |> List.map (fun num ->
        let baseLine = HanoiTowerRec num 1 2
        printfn "finished: %A -rec" num
        let test = HanoiTowerTailRecursive num 1 2
        printfn "finished: %A -tail rec" num
        if not (testResult baseLine test) then printfn "bug at Num: %A" num else ())
    |> ignore
    0 // return an integer exit code
