package com.dragonlyj.selab;

public class CASQueue<T> {
    private static final sun.misc.Unsafe UNSAFE;
    private static final long headOffset;
    private static final long tailOffset;
    static {
        try {
            UNSAFE = UnsafeClient.getUnsafe();
            Class<?> k = CASQueue.class;
            headOffset = UNSAFE.objectFieldOffset
                    (k.getDeclaredField("_head"));
            tailOffset = UNSAFE.objectFieldOffset
                    (k.getDeclaredField("_tail"));
        } catch (Exception e) {
            throw new Error(e);
        }
    }

    // 因为允许失败，就不返回boolean了
    private void casTail(Node<T> expected, Node<T> update) {
        UNSAFE.compareAndSwapObject(this, tailOffset, expected, update);
    }

    private boolean casHead(Node<T> expected, Node<T> update) {
        return UNSAFE.compareAndSwapObject(this, headOffset, expected, update);
    }

    private transient volatile Node<T> _tail;
    private transient volatile Node<T> _head;

    public CASQueue(){
        Node<T> emptyHead = new Node<>(null);
        _head = _tail =emptyHead;
    }

    public void Enqueue(T value){
        Node<T> newNode = new Node<>(value);

        Node<T> t;
        // 入队分两步走，首先修改_tail.next指向新增节点，然后修改_tail指向新增节点
        // 必须保证修改_tail.next，再修改_tail(可以失败，这种情况表示其他线程可以继续修改)
        while (true){
            t = _tail;
            Node<T> next = t.next;
            if (t != _tail){
                // 尾指针被修改了，其他线程已经完整的执行了两步入队操作
                // 重启入队流程
                continue;
            }
            if (next != null){
                // 尾指针的next非空，表示有线程正在入队并进行了一半的修改
                // (修改_tail.next，但未来得及再修改_tail)
                // 使用CAS跟进其他线程对_tail.next的修改
                // 即主动帮助修改_tail.next的线程完成后半部分对_tail的修改
                // 这个修改允许失败，防止还有第三个以上的线程同时在操作
                // 因此这个修改的条件是_tail跟t相等:CAS(_tail,t, next)
                casTail(t, next);
                continue;
            }
            if (t.casNext(next,newNode)){
                // CAS(t.next,next,newNode)
                // 在这个地方next是空
                // t.next也是空，修改就会成功
                // 修改失败需要重新入队流程
                break;
            }
        }
        // 这个修改允许失败，防止还有第三个以上的线程同时在操作
        // 因此这个修改的条件是_tail跟t相等:CAS(_tail,t, newNode)
        casTail(t, newNode);
    }

    public T Dequeue(){
        T val = null;
        // 出队分两步走，首先修改_head指向_head.next（队列非空的情况下），再读取_head前一个节点包含的值
        // 虽然修改操作只有一个，但是需要考虑入队操作导致_tail可能落后于_head违反了队列的性质
        while (true){
            Node<T> h = _head;
            Node<T> t = _tail;
            Node<T> hNext = h.next;
            if (h != _head){
                // _head被修改了, 重启出队流程
                continue;
            }
            if (h == t){
                if (hNext == null) {
                    // 空队列，返回空值
                    break;
                }else
                {   // (h == t && hNext != null)
                    // “半空”队列：入队线程执行了一半另_tail.next非空，
                    // 但是_head和_tail还指向同一个节点
                    // 也就是入队线程执行前队列是空的，正在加入的节点将另队列包含1个节点
                    // 协助入队线程完成第二个修改_tail的操作（允许失败）
                    // 然后重启出队流程
                    // CAS(_tail,t,hNext)
                    casTail(t, hNext);
                    continue;
                }
            }
            if (casHead(h,hNext)){// CAS(_head, h, hNext)
                val = hNext.value;
                h.next = null;
                break;
            }
        }
        return val;
    }

    public T peek(){
        T val = null;
        while (true){
            Node<T> h = _head;
            Node<T> t = _tail;
            Node<T> hNext = h.next;
            if (h != _head){
                // _head被修改了, 重启出队流程
                continue;
            }
            if (h == t && hNext == null){
                // 空队列，返回空值
                break;
            }
            if (h == t){
                // “半空”队列：入队线程执行了一半另_tail.next非空，
                // 但是_head和_tail还指向同一个节点
                // 也就是入队线程执行前队列是空的，正在加入的节点将另队列包含1个节点
                // 协助入队线程完成第二个修改_tail的操作（允许失败）
                // 然后重启出队流程
                // CAS(_tail,t,hNext)
                casTail(t, hNext);
                continue;
            }
            val = hNext.value;
            break;
        }
        return val;
    }

    private static class Node<T>{
        private static final sun.misc.Unsafe UNSAFE;
        private static final long valueOffset;
        private static final long nextOffset;

        static {
            try {
                UNSAFE = UnsafeClient.getUnsafe();
                Class<?> k = Node.class;
                valueOffset = UNSAFE.objectFieldOffset
                        (k.getDeclaredField("value"));
                nextOffset = UNSAFE.objectFieldOffset
                        (k.getDeclaredField("next"));
            } catch (Exception e) {
                throw new Error(e);
            }
        }

        volatile Node<T> next;
        volatile T value;

        Node(T val) {
            UNSAFE.putObject(this, valueOffset, val);
        }

        // 之所以需要单独一个方法进行封装，是因为CAS没有直接支持泛型，需要通过一些额外的手段来完成。
        public boolean casNext(Node<T> expected, Node<T> update) {
            return UNSAFE.compareAndSwapObject(this,nextOffset,expected,update);
        }
    }
}
