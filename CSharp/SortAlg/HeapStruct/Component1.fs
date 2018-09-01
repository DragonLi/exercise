module HeapStruct

type PairingTree<'E> = {min : 'E; subHeaps : List<PairingTree<'E>>}

type PairingHeap<'E> = Empty | PTree of PairingTree<'E>

let findMin (heap : PairingHeap<'E>) : 'E =
    match heap with
        //| Empty -> MatchFailureException
        | PTree tree -> tree.min

let merge heap1 (heap2:PairingHeap<'E>) : PairingHeap<'E>=
    match heap1,heap2 with
        | Empty,_ -> heap2
        | _,Empty -> heap1
        | PTree tree1, PTree tree2 ->
            if (tree1.min < tree2.min) then
                PTree {min = tree1.min; subHeaps = tree2 :: tree1.subHeaps}
            else
                PTree {min = tree2.min; subHeaps = tree1 :: tree2.subHeaps}

let insert (ele:'E)(heap:PairingHeap<'E>) : PairingHeap<'E> =
    let initTree = PTree {min = ele; subHeaps=[]}
    merge initTree heap

let rec mergePair (subheaps:List<PairingTree<'E>>) : PairingHeap<'E> =
    match subheaps with
        | [] -> Empty
        | [h] -> PTree h
        | h0 :: h1 :: lst -> merge (merge (PTree h0) (PTree h1)) (mergePair lst)

let deleteMin (heap:PairingHeap<'E>) : PairingHeap<'E> = 
    match heap with
        //| Empty -> MatchFailureException
        | PTree tree -> mergePair tree.subHeaps