 (export "testInt" (func $testInt))
 (export "testLong" (func $testLong))
 (export "testFloat" (func $testFloat))
 (export "testDouble" (func $testDouble))
 (export "memory" (memory $0))
 (func $testInt (type $iv) (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  (drop
   (i32.eqz
    (get_local $0)
   )
  )
  (drop
   (get_local $0)
  )
  (drop
   (i32.sub
    (i32.const 0)
    (get_local $0)
   )
  )
  (drop
   (i32.xor
    (get_local $0)
    (i32.const -1)
   )
  )
  (set_local $2
   (i32.eqz
    (get_local $0)
   )
  )
  (set_local $1
   (get_local $0)
  )
  (set_local $1
   (i32.sub
    (i32.const 0)
    (get_local $0)
   )
  )
  (set_local $1
   (i32.xor
    (get_local $0)
    (i32.const -1)
   )
  )
  (set_local $0
   (i32.add
    (get_local $0)
    (i32.const 1)
   )
  )
  (set_local $0
   (i32.sub
    (get_local $0)
    (i32.const 1)
   )
  )
  (set_local $0
   (i32.add
    (get_local $0)
    (i32.const 1)
   )
  )
  (set_local $0
   (i32.sub
    (get_local $0)
    (i32.const 1)
   )
  )
  (set_local $1
   (tee_local $0
    (i32.add
     (get_local $0)
     (i32.const 1)
    )
   )
  )
  (set_local $1
   (tee_local $0
    (i32.sub
     (get_local $0)
     (i32.const 1)
    )
   )
  )
  (set_local $1
   (i32.sub
    (tee_local $0
     (i32.add
      (get_local $0)
      (i32.const 1)
     )
    )
    (i32.const 1)
   )
  )
  (set_local $1
   (i32.add
    (tee_local $0
     (i32.sub
      (get_local $0)
      (i32.const 1)
     )
    )
    (i32.const 1)
   )
  )
  (set_global $int_c
   (i32.add
    (get_global $int_c)
    (i32.const 1)
   )
  )
  (set_global $int_c
   (i32.sub
    (get_global $int_c)
    (i32.const 1)
   )
  )
  (set_global $int_c
   (i32.add
    (get_global $int_c)
    (i32.const 1)
   )
  )
  (set_global $int_c
   (i32.sub
    (get_global $int_c)
    (i32.const 1)
   )
  )
 )
 (func $testLong (type $Iv) (param $0 i64)
  (local $1 i64)
  (local $2 i32)
  (drop
   (i64.eqz
    (get_local $0)
   )
  )
  (drop
   (get_local $0)
  )
  (drop
   (i64.sub
    (i64.const 0)
    (get_local $0)
   )
  )
  (drop
   (i64.xor
    (get_local $0)
    (i64.const -1)
   )
  )
  (set_local $2
   (i64.eqz
    (get_local $0)
   )
  )
  (set_local $1
   (get_local $0)
  )
  (set_local $1
   (i64.sub
    (i64.const 0)
    (get_local $0)
   )
  )
  (set_local $1
   (i64.xor
    (get_local $0)
    (i64.const -1)
   )
  )
  (set_local $0
   (i64.add
    (get_local $0)
    (i64.const 1)
   )
  )
  (set_local $0
   (i64.sub
    (get_local $0)
    (i64.const 1)
   )
  )
  (set_local $0
   (i64.add
    (get_local $0)
    (i64.const 1)
   )
  )
  (set_local $0
   (i64.sub
    (get_local $0)
    (i64.const 1)
   )
  )
  (set_local $1
   (tee_local $0
    (i64.add
     (get_local $0)
     (i64.const 1)
    )
   )
  )
  (set_local $1
   (tee_local $0
    (i64.sub
     (get_local $0)
     (i64.const 1)
    )
   )
  )
  (set_local $1
   (i64.sub
    (tee_local $0
     (i64.add
      (get_local $0)
      (i64.const 1)
     )
    )
    (i64.const 1)
   )
  )
  (set_local $1
   (i64.add
    (tee_local $0
     (i64.sub
      (get_local $0)
      (i64.const 1)
     )
    )
    (i64.const 1)
   )
  )
  (set_global $long_c
   (i64.add
    (get_global $long_c)
    (i64.const 1)
   )
  )
  (set_global $long_c
   (i64.sub
    (get_global $long_c)
    (i64.const 1)
   )
  )
  (set_global $long_c
   (i64.add
    (get_global $long_c)
    (i64.const 1)
   )
  )
  (set_global $long_c
   (i64.sub
    (get_global $long_c)
    (i64.const 1)
   )
  )
 )
 (func $testFloat (type $fv) (param $0 f32)
  (local $1 f32)
  (local $2 i32)
  (drop
   (f32.eq
    (get_local $0)
    (f32.const 0)
   )
  )
  (drop
   (get_local $0)
  )
  (drop
   (f32.neg
    (get_local $0)
   )
  )
  (set_local $2
   (f32.eq
    (get_local $0)
    (f32.const 0)
   )
  )
  (set_local $1
   (get_local $0)
  )
  (set_local $1
   (f32.neg
    (get_local $0)
   )
  )
  (set_local $0
   (f32.add
    (get_local $0)
    (f32.const 1)
   )
  )
  (set_local $0
   (f32.sub
    (get_local $0)
    (f32.const 1)
   )
  )
  (set_local $0
   (f32.add
    (get_local $0)
    (f32.const 1)
   )
  )
  (set_local $0
   (f32.sub
    (get_local $0)
    (f32.const 1)
   )
  )
  (set_local $1
   (tee_local $0
    (f32.add
     (get_local $0)
     (f32.const 1)
    )
   )
  )
  (set_local $1
   (tee_local $0
    (f32.sub
     (get_local $0)
     (f32.const 1)
    )
   )
  )
  (set_local $1
   (f32.sub
    (tee_local $0
     (f32.add
      (get_local $0)
      (f32.const 1)
     )
    )
    (f32.const 1)
   )
  )
  (set_local $1
   (f32.add
    (tee_local $0
     (f32.sub
      (get_local $0)
      (f32.const 1)
     )
    )
    (f32.const 1)
   )
  )
  (set_global $float_c
   (f32.add
    (get_global $float_c)
    (f32.const 1)
   )
  )
  (set_global $float_c
   (f32.sub
    (get_global $float_c)
    (f32.const 1)
   )
  )
  (set_global $float_c
   (f32.add
    (get_global $float_c)
    (f32.const 1)
   )
  )
  (set_global $float_c
   (f32.sub
    (get_global $float_c)
    (f32.const 1)
   )
  )
 )
 (func $testDouble (type $Fv) (param $0 f64)
  (local $1 f64)
  (local $2 i32)
  (drop
   (f64.eq
    (get_local $0)
    (f64.const 0)
   )
  )
  (drop
   (get_local $0)
  )
  (drop
   (f64.neg
    (get_local $0)
   )
  )
  (set_local $2
   (f64.eq
    (get_local $0)
    (f64.const 0)
   )
  )
  (set_local $1
   (get_local $0)
  )
  (set_local $1
   (f64.neg
    (get_local $0)
   )
  )
  (set_local $0
   (f64.add
    (get_local $0)
    (f64.const 1)
   )
  )
  (set_local $0
   (f64.sub
    (get_local $0)
    (f64.const 1)
   )
  )
  (set_local $0
   (f64.add
    (get_local $0)
    (f64.const 1)
   )
  )
  (set_local $0
   (f64.sub
    (get_local $0)
    (f64.const 1)
   )
  )
  (set_local $1
   (tee_local $0
    (f64.add
     (get_local $0)
     (f64.const 1)
    )
   )
  )
  (set_local $1
   (tee_local $0
    (f64.sub
     (get_local $0)
     (f64.const 1)
    )
   )
  )
  (set_local $1
   (f64.sub
    (tee_local $0
     (f64.add
      (get_local $0)
      (f64.const 1)
     )
    )
    (f64.const 1)
   )
  )
  (set_local $1
   (f64.add
    (tee_local $0
     (f64.sub
      (get_local $0)
      (f64.const 1)
     )
    )
    (f64.const 1)
   )
  )
  (set_global $double_c
   (f64.add
    (get_global $double_c)
    (f64.const 1)
   )
  )
  (set_global $double_c
   (f64.sub
    (get_global $double_c)
    (f64.const 1)
   )
  )
  (set_global $double_c
   (f64.add
    (get_global $double_c)
    (f64.const 1)
   )
  )
  (set_global $double_c
   (f64.sub
    (get_global $double_c)
    (f64.const 1)
   )
  )
 )
