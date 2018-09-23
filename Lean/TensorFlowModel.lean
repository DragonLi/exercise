import data.vector
import init.data.array.basic
--import data.fp.basic

namespace TensorFlowModel

definition PosNat := {n:nat // n > 0}

def PosNat.one : PosNat := ⟨ 1 , nat.lt_succ_self _ ⟩
--#print one_as_pos_nat._proof_1

def PosNat.Add (x y:PosNat) : PosNat := ⟨ x.val + y.val , add_pos x.property y.property ⟩
--#print add_pos_nat

instance : has_add PosNat := ⟨ PosNat.Add ⟩

def PosNat.Mul (x y:PosNat) : PosNat := ⟨ x.val * y.val , mul_pos x.property y.property ⟩
--#print mult_pos_nat

instance : has_mul PosNat := ⟨ PosNat.Mul ⟩

--def inj_pos_nat (num : PosNat): nat := num.val
--define lift from pos nat to nat
instance pos_nat_has_one : has_one PosNat := ⟨ PosNat.one ⟩
instance  inj_pos_nat : has_coe PosNat nat := coe_subtype
#check (1 * PosNat.one : nat)

--pos nat is semigroup

def CapacityOfPosNatList : list PosNat -> PosNat
| list.nil := PosNat.one
| (n :: t) := n * (CapacityOfPosNatList t)
--#print CapacityOfPosNatList._main

def CapacityOfDim1 {rank:nat}(dim : vector PosNat rank) : PosNat := CapacityOfPosNatList dim.val

def CapacityOfDim {rank:nat}(dim : vector PosNat rank) : PosNat := dim.val.foldl PosNat.Mul PosNat.one

#eval (CapacityOfPosNatList list.nil : nat)
#eval (CapacityOfDim ⟨ list.nil , by simp ⟩ : nat)

structure Tensor1 := {rank : nat}(dim : vector PosNat rank)
--#print Tensor1
#check Tensor1.mk ⟨ list.nil , by simp ⟩

--add array CapacityOfDim dim
--definition Scalar := float
structure Tensor := {rank : nat}{dim : vector PosNat rank}(data: array (CapacityOfDim dim).val nat)

end TensorFlowModel