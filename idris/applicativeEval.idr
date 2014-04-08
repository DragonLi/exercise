data Exp = var String | val Int | plus Exp Exp

env : Type
env = List (String , Int)

data Eval a = MkEval (env -> Maybe a)
