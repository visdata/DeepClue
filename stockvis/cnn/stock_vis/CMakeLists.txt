CMAKE_MINIMUM_REQUIRED(VERSION 2.8)

foreach(TARGET StockHierAvgLRP StockHierAvgLRPR2 StockHierAvgSamplingConstLookup StockHierAvgSamplingFinetuneTfIdfRes StockHierAvgLRPR1v3 StockHierAvgLRPR1v2 StockHierAvgSamplingFinetuneTfIdfResReg)
  ADD_EXECUTABLE(${TARGET} ${TARGET}.cc)
  target_link_libraries(${TARGET} cnn ${LIBS})
  if (WITH_CUDA_BACKEND)
    add_dependencies(${TARGET} cnncuda)
    target_link_libraries(${TARGET} cnncuda)
    CUDA_ADD_CUBLAS_TO_TARGET(${TARGET})
  endif (WITH_CUDA_BACKEND)
endforeach()

