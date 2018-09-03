namespace Unification

inductive Fin : nat -> Type
| f0 : Fin (nat.succ nat.zero)
| fs {n: nat} : Fin n -> Fin (nat.succ n)

#print Fin

inductive Term : nat -> Type
| leaf {n:nat} : Term n
| var {n:nat} : Fin n -> Term n /-iota-/
| fork {n:nat} (s: Term n)(t:Term n) : Term n

notation `ι` := Term.var
#print Term

/-- ▸ ◂ -/

def injectFin {m n:nat}: (Fin m -> Fin n) -> Fin m -> Term n :=
λ f v, Term.var (f v)

notation ▹ f := injectFin f

#print injectFin

def liftFin {m n:nat}(f: Fin m -> Term n) : Term m -> Term n
| Term.leaf := @Term.leaf n
| (Term.var k) := f k
| (Term.fork s t) := Term.fork (liftFin s) (liftFin t)

postfix  `◃`:std.prec.max  := liftFin

--#print liftFin._main._pack

def subEq {m n:nat}(f g:Fin m -> Term n) :=
Π (x:Fin m),(f x = g x)

#print subEq

def subCompose {m n l:nat}(f:Fin m -> Term n)(g:Fin l -> Term m) : Fin l -> Term n :=
λ k, (f ◃) (g k)

notation f `◇` g := subCompose f g

#print subCompose

lemma subIotaId {m:nat} (t: Term m): ι ◃ t = t
:= sorry
/-
| Term.leaf := refl
| (Term.var n) := refl
| (Term.fork s t) := sorry
-/
#check @subIotaId

lemma subComposeLiftFlat {m n l:nat}(t:Term l)(f:Fin m -> Term n)(g:Fin l -> Term m):
(f ◇ g) ◃ t = f ◃ (g ◃ t)
:= sorry
#check @subComposeLiftFlat

lemma flatSubCompose {m n l:nat}(f:Fin n -> Term l)(r: Fin m -> Fin n):
(f ◇ (▹ r)) = λ k, f (r k)
:= sorry
#check @flatSubCompose

#print notation ⁻¹ ◃ ▹ ◇
end Unification