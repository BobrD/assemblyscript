 (export "test" (func $test))
 (export "memory" (memory $0))
 (func $test (type $iv) (param $0 i32)
  (local $1 i32)
  (drop
   (i32.load
    (i32.load offset=8
     (get_local $0)
    )
   )
  )
  (drop
   (i32.load offset=4
    (i32.load offset=8
     (get_local $0)
    )
   )
  )
  (drop
   (i32.load offset=8
    (i32.load offset=8
     (get_local $0)
    )
   )
  )
  (drop
   (i32.load offset=12
    (i32.load offset=8
     (get_local $0)
    )
   )
  )
  (set_local $1
   (i32.const 4)
  )
  (drop
   (i32.load
    (i32.add
     (i32.load offset=8
      (get_local $0)
     )
     (i32.mul
      (get_local $1)
      (i32.const 4)
     )
    )
   )
  )
  (drop
   (i32.load
    (i32.add
     (i32.load offset=8
      (get_local $0)
     )
     (i32.mul
      (i32.add
       (get_local $1)
       (i32.const 1)
      )
      (i32.const 4)
     )
    )
   )
  )
 )
