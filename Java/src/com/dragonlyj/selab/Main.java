package com.dragonlyj.selab;

import java.util.BitSet;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;

public class Main {

    public static void main(String[] args) {
        AtomicInteger enqueueCounter = new AtomicInteger();
        AtomicInteger dequeueCounter = new AtomicInteger();
        CASQueue<Integer> tq = new CASQueue<>();
        ConcurrentLinkedQueue<Integer> cmp = new ConcurrentLinkedQueue<>();
        int max = 2048;
        Thread[] arrayT = new Thread[4];
        for (int i = 0; i < 2; i++) {
            arrayT[i]=new Thread(() -> {
                int count = 0;
                int val;
                while ((val = enqueueCounter.getAndIncrement()) < max){
                    tq.Enqueue(val);
                    ++count;
                }
                System.out.println(Thread.currentThread()+" generate: "+count);
            });
        }
        for (int i = 0; i < 2; i++) {
            arrayT[2+i]=new Thread(()->{
                int count = 0;
                while (dequeueCounter.getAndIncrement() < max){
                    Integer val = tq.Dequeue();
                    if (val != null)
                    {
                        cmp.add(val);
                        ++count;
                    } else {
                        // sometimes consumer is faster than producer, so return null!
                        dequeueCounter.decrementAndGet();
                    }
                }
                System.out.println(Thread.currentThread()+" consume: "+count);
            });
        }
        for (int i = 0; i < 4; i++) {
            arrayT[i].start();
        }
        for (int i = 0; i < 4; i++) {
            try {
                arrayT[i].join();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        BitSet mask = new BitSet(max);
        cmp.forEach(mask::set);
        int cardinality = mask.cardinality();
        System.out.println("fetch number: "+cardinality);
        if (cardinality != cmp.size()){
            System.out.println("bug: " + cardinality);
        }else{
            System.out.println("ok");
        }
    }
}
