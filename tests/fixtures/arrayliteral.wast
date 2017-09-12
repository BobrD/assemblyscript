 (export "test" (func $test))
 (export "testNested" (func $testNested))
 (export "memory" (memory $0))
 (func $test (type $i) (result i32)
  (local $0 i32)
  (return
   (block (result i32)
    (i32.store
     (tee_local $0
      (call $lib:memset
       (call $lib:malloc
        (i32.const 12)
       )
       (i32.const 0)
       (i32.const 12)
      )
     )
     (i32.const 4)
    )
    (i32.store offset=4
     (get_local $0)
     (i32.const 4)
    )
    (i32.store offset=8
     (get_local $0)
     (call $lib:malloc
      (i32.const 16)
     )
    )
    (i32.store
     (i32.load offset=8
      (get_local $0)
     )
     (i32.const 1)
    )
    (i32.store offset=4
     (i32.load offset=8
      (get_local $0)
     )
     (i32.const 2)
    )
    (i32.store offset=8
     (i32.load offset=8
      (get_local $0)
     )
     (i32.const 0)
    )
    (i32.store offset=12
     (i32.load offset=8
      (get_local $0)
     )
     (i32.const 3)
    )
    (get_local $0)
   )
  )
 )
 (func $testNested (type $i) (result i32)
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (return
   (block (result i32)
    (i32.store
     (tee_local $0
      (call $lib:memset
       (call $lib:malloc
        (i32.const 12)
       )
       (i32.const 0)
       (i32.const 12)
      )
     )
     (i32.const 3)
    )
    (i32.store offset=4
     (get_local $0)
     (i32.const 3)
    )
    (i32.store offset=8
     (get_local $0)
     (call $lib:malloc
      (i32.const 12)
     )
    )
    (i32.store
     (i32.load offset=8
      (get_local $0)
     )
     (block (result i32)
      (i32.store
       (tee_local $1
        (call $lib:memset
         (call $lib:malloc
          (i32.const 12)
         )
         (i32.const 0)
         (i32.const 12)
        )
       )
       (i32.const 4)
      )
      (i32.store offset=4
       (get_local $1)
       (i32.const 4)
      )
      (i32.store offset=8
       (get_local $1)
       (call $lib:malloc
        (i32.const 16)
       )
      )
      (i32.store
       (i32.load offset=8
        (get_local $1)
       )
       (i32.const 1)
      )
      (i32.store offset=4
       (i32.load offset=8
        (get_local $1)
       )
       (i32.const 2)
      )
      (i32.store offset=8
       (i32.load offset=8
        (get_local $1)
       )
       (i32.const 0)
      )
      (i32.store offset=12
       (i32.load offset=8
        (get_local $1)
       )
       (i32.const 3)
      )
      (get_local $1)
     )
    )
    (i32.store offset=4
     (i32.load offset=8
      (get_local $0)
     )
     (block (result i32)
      (i32.store
       (tee_local $2
        (call $lib:memset
         (call $lib:malloc
          (i32.const 12)
         )
         (i32.const 0)
         (i32.const 12)
        )
       )
       (i32.const 1)
      )
      (i32.store offset=4
       (get_local $2)
       (i32.const 1)
      )
      (i32.store offset=8
       (get_local $2)
       (call $lib:malloc
        (i32.const 4)
       )
      )
      (i32.store
       (i32.load offset=8
        (get_local $2)
       )
       (i32.const 4)
      )
      (get_local $2)
     )
    )
    (i32.store offset=8
     (i32.load offset=8
      (get_local $0)
     )
     (block (result i32)
      (i32.store
       (tee_local $3
        (call $lib:memset
         (call $lib:malloc
          (i32.const 12)
         )
         (i32.const 0)
         (i32.const 12)
        )
       )
       (i32.const 0)
      )
      (i32.store offset=4
       (get_local $3)
       (i32.const 0)
      )
      (i32.store offset=8
       (get_local $3)
       (call $lib:malloc
        (i32.const 0)
       )
      )
      (get_local $3)
     )
    )
    (get_local $0)
   )
  )
 )
