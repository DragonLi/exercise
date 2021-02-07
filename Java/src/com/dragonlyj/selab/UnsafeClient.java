package com.dragonlyj.selab;

import sun.misc.Unsafe;

import java.lang.reflect.Field;

public class UnsafeClient {
    public static Unsafe getUnsafe(){
        try {
            Field f = Unsafe.class.getDeclaredField("theUnsafe");
            f.setAccessible(true);
            return (Unsafe) f.get(null);
        } catch (Throwable e) {
            throw new RuntimeException(e);
        }
    }
}
