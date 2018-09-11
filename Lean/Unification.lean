namespace Unification

inductive Fin : nat -> Type
| f0 {n:nat}: Fin (nat.succ n)
| fs {n: nat} : Fin n -> Fin (nat.succ n)
/-
#check @Fin.rec
--#print Fin.rec
#check @Fin.rec_on
--#print fin.rec_on
#check @Fin.below
#check @Fin.ibelow
#check @Fin.brec_on
#check @Fin.binduction_on
#check @Fin.cases_on
#check @Fin.sizeof
--#print Fin.sizeof
--#reduce (Fin.sizeof _ (Fin.fs (Fin.fs Fin.f0)))
#check @Fin.has_sizeof_inst
#check @Fin.no_confusion
#check @Fin.no_confusion_type
#check @Fin.fs.inj
#check @Fin.fs.inj_arrow
#check @Fin.fs.inj_eq
#check @Fin.fs.sizeof_spec
--#check @well_founded.fix_F
--#check @well_founded.fix_F_eq
-/
inductive Term : nat -> Type
| leaf {n:nat} : Term n
| var {n:nat} : Fin n -> Term n /-iota-/
| fork {n:nat} (s: Term n)(t:Term n) : Term n

notation `ι` := Term.var
--#print Term.rec
--#print Term.rec_on

/-- ▸ ◂ -/

def injectFin {m n:nat}: (Fin m -> Fin n) -> Fin m -> Term n :=
λ f v, Term.var (f v)

notation ▹ f := injectFin f

--#print injectFin

def liftFin {m n:nat}(f: Fin m -> Term n) : Term m -> Term n
| Term.leaf := @Term.leaf n
| (Term.var k) := f k
| (Term.fork s t) := Term.fork (liftFin s) (liftFin t)

postfix  `◃`:std.prec.max  := liftFin

--#print liftFin._main._pack

def subEq {m n:nat}(f g:Fin m -> Term n) :=
Π (x:Fin m),(f x = g x)

--#print subEq

def subCompose {m n l:nat}(f:Fin m -> Term n)(g:Fin l -> Term m) : Fin l -> Term n :=
λ k, (f ◃) (g k)

notation f `◇` g := subCompose f g

--#print subCompose
def subIotaId' {m:nat}:Π (t: Term m), ι ◃ t = t
| Term.leaf := by unfold liftFin
| (Term.var n) := by unfold liftFin
| (Term.fork s t) :=
    let hs := subIotaId' s in
    let ht := subIotaId' t in
    begin
        unfold liftFin,
        calc
            Term.fork (ι◃ s) (ι◃ t) = Term.fork s (ι◃ t) : by rw hs
            ... = Term.fork s t : by rw ht
    end
--#print subIotaId'._main._pack

def subIotaId {m:nat}(t: Term m): ι ◃ t = t  :=
match t with
| Term.leaf := by simp[liftFin]
| (Term.var n) := by simp[liftFin]
| (Term.fork s t) := 
    begin
     simp[liftFin],
     split,
     show ι◃ s = s,from (_match s),
     show ι◃ t = t,from (_match t)
    end
end

--#print subIotaId._match_1._pack

def subComposeLiftFlat {m n l:nat}(t:Term l)(f:Fin m -> Term n)(g:Fin l -> Term m):
(f ◇ g) ◃ t = f ◃ (g ◃ t) :=
match t with
| Term.leaf := by simp[liftFin]
| (Term.var n) := by simp[liftFin,subCompose]
| (Term.fork s t) := 
    begin
        simp[liftFin],split;
        apply _match
    end
end

--#print subComposeLiftFlat._match_1._pack

def flatSubCompose {m n l:nat}(f:Fin n -> Term l)(r: Fin m -> Fin n)(v:Fin m):
(f ◇ (▹ r)) v = f (r v) :=
by simp[liftFin,injectFin,subCompose]

def thin : Π{n:nat} (x:Fin (n+1))(y:Fin n), Fin (n+1)
| n Fin.f0 y := Fin.fs y
| (n+1) (Fin.fs x) Fin.f0 := Fin.f0
| (n+1) (Fin.fs x) (Fin.fs y) := Fin.fs (thin x y)
--#print thin._main

lemma thin_inj {n:nat}(x:Fin (n+1))(y z:Fin n): thin x y = thin x z -> y = z
:= sorry

lemma thin_rej {n:nat}(x:Fin (n+1))(y:Fin n):thin x y ≠ x
:= sorry

lemma thin_exist {n:nat}(x y:Fin (n+1)) : x ≠ y -> (∃ y', thin x y' = y)
:= sorry

#print notation ◃ ▹ ◇
end Unification