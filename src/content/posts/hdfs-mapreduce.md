---
title: "HDFS存储与MapReduce计算机制"
description: "从HDFS存储架构、MapReduce计算框架到Spark运行机制，系统梳理大数据核心技术栈。"
pubDatetime: 2026-06-13T14:00:00.000+08:00
tags: ["数仓"]
draft: false
---

# HDFS存储与MapReduce计算机制

## 能力

![](/images/hdfs-mapreduce/1.png)

## 一、HDFS存储与读写机制

Hadoop生态系统是海量数据处理的基石，其核心组件HDFS（Hadoop Distributed File System）提供了高可靠、高吞吐的分布式存储能力。

### 1. HDFS架构定位

一个完整的大数据技术栈通常包含以下层次：

* **存储层**：以HDFS为代表，负责底层数据的持久化存储。
* **计算引擎层**：提供分布式计算框架，覆盖离线（MapReduce、Spark）与实时（Flink、Storm）两类场景。
* **分析层**：如**Apache Doris**，致力于实现存储与计算的一体化，提供高性能实时分析服务。

### 2. 数据读写流程

#### 2.1 HDFS读取流程

用户从HDFS读取数据的标准流程如下图所示，清晰展现了客户端与NameNode、DataNode的交互过程：

![](/images/hdfs-mapreduce/2.webp)

#### 2.2 HDFS数据更新与合并

数据写入或更新过程中，HDFS通过特定的合并机制确保数据一致性，其核心步骤示意图如下：

![](/images/hdfs-mapreduce/3.webp)

## 二、MapReduce计算框架核心机制

在分布式计算框架（如MapReduce、Spark）中，Shuffle是数据从Map阶段到Reduce阶段进行跨节点重分布的关键过程，其性能直接决定了作业的整体效率。

### 1. Map端Shuffle

1. **写入环形缓冲区**：Map Task将输出的Key-Value对写入内存环形缓冲区，并依据**分区器（Partitioner）**进行初步分区与**内部排序**。
2. **溢写（Spill）至磁盘**：缓冲区达到预设阈值后，启动溢写流程，将排序后的数据写入本地磁盘的临时文件。
3. **磁盘文件归并（Merge）**：所有临时文件最终归并为一个已分区且全局排序的数据文件，供Reduce Task后续拉取。

### 2. Reduce端Shuffle

1. **数据拉取（Fetch）**：Reduce Task启动Fetcher线程，通过HTTP协议从各Map Task所在节点拉取属于自己分区的数据。
2. **排序与合并**：拉取到的数据在内存或磁盘中进行二次排序与合并，确保同一Key的所有Value汇聚一处。
3. **Reduce计算**：以排序合并后的（Key, Value集合）作为输入，执行用户定义的Reduce函数，生成最终输出。

**技术演进**：为了应对更复杂的实时分析需求，业界正从"存算分离"架构向"存算一体"架构演进，例如**Apache Doris**等系统旨在统一存储与计算，提升分析性能与资源利用率。

## 三、YARN资源管理核心机制

YARN（Yet Another Resource Negotiator）采用主从（Master-Slave）架构进行统一的集群资源管理与作业调度。其核心交互流程如下图所示：

![](/images/hdfs-mapreduce/4.webp)

1. **作业提交（Client to RM）**：客户端将包含作业描述信息（如JAR包路径、资源需求等）的应用提交请求发送至**资源管理器（ResourceManager, RM）**，后者作为全局资源协调者，负责接收所有作业请求。
2. **应用管理器启动（RM to NM）**：RM根据集群负载与调度策略，从**节点管理器（NodeManager, NM）**集群中选择一个合适节点，并在该节点上启动**应用管理器（ApplicationMaster, AM）**。AM是应用级别的"管家"，负责为单个应用协商资源并管理任务执行的生命周期。
3. **资源申请与分配（AM to RM）**：AM根据作业计算需求（如Map、Reduce任务数量）向RM发起资源请求。RM的调度器综合全局资源视图（通过各NM的定期心跳汇报获得）进行决策，为AM分配封装了CPU、内存等资源的**容器（Container）**。
4. **任务执行（AM to NM）**：AM接收到已分配的Container列表后，向对应的NM发出启动指令。NM负责在本地节点上启动Container，并在其中执行具体的计算任务（如MapTask或ReduceTask）。
5. **状态监控与心跳机制**：
   * **NM -> RM**：各NM通过**周期性心跳（Heartbeat）**向RM汇报本节点资源使用情况、Container运行状态及健康度，RM据此维护全局资源池的实时视图。
   * **AM -> RM/AM -> NM**：AM亦向RM汇报应用进度，并向自己管辖下的Container发送指令或接收任务状态更新，形成"RM-AM-NM-Container"的多级监控链路。

整个过程实现了资源管理的全局调度（RM层）与作业执行的本地协调（AM层）的解耦，提升了大型集群的扩展性与多租户支持能力。

## 四、文件重排与压缩

在数据存储与分析层面，列式存储格式（如ORC）与高效的压缩算法是提升查询性能、降低存储成本的关键技术。ORC（Optimized Row Columnar）文件是Hive推出的高性能列式存储格式，其压缩与索引机制对提升OLAP查询效率至关重要。

### 1. ORC文件格式核心特性

1. **混合存储结构**：ORC采用"大粒度行组（Stripe），小粒度列式存储"的混合存储方式，兼顾了批量读取与列式压缩的优势。
2. **三级索引体系**：
   * **Stripe文件索引**：快速定位Stripe范围。
   * **Stripe内部索引**：提供行组级别的数据边界信息。
   * **Rowgroup索引**：更细粒度的数据定位，支持谓词下推，大幅减少数据扫描量。
3. **列级压缩**：支持多种压缩算法（如Zlib、Snappy、Zstd），可针对不同列的数据类型与特征选择最合适的压缩策略，实现最优的存储空间节省与解压性能平衡。

![](/images/hdfs-mapreduce/5.webp)

### 2. 重排原理

适用场景：数据组织密集，数据量级较大的大宽表，例如流量数据、日志数据、支付/交易数据。

使用方法：在最终输出的时候选择合适的排序列，然后利用DISTRIBUTE BY分区 SORT BY排序列。

## 五、Apache Spark 架构与运行机制

### 1. 核心运行组件

一个完整的 Spark 应用程序（Application）由三个核心角色构成：

* **Driver Program**：应用的主控程序，负责解析用户代码、定义作业 DAG、并向资源管理器申请资源。
* **Executor**：运行在集群工作节点上的进程，负责执行 Driver 分配的具体计算任务（Task），并提供内存存储 RDD 数据。
* **Cluster Manager**：外部的资源调度系统，负责跨应用分配集群的计算资源（CPU、内存）。常见的包括 YARN、Kubernetes、Standalone 等。

Driver 是大脑，负责划分 Stage，生成 DAG；Executor 负责执行。

### 2. 核心运行模式对比

Spark 的部署模式主要依据 **Driver 程序的运行位置** 来区分，这直接决定了资源申请者、生命周期和单点瓶颈。

| **模式** | **是否有 AM?** | **资源申请者** | **Driver 所在位置** | **提交客户端可否关闭？** | **潜在的单点瓶颈** |
|---|---|---|---|---|---|
| **YARN Cluster** | ✅ 有 | AM (等同于 Driver) | 在 YARN 集群内部的 Container 中 | ✅ 可关闭 | Driver 是单点 |
| **YARN Client** | ✅ 有 | AM (仅作为资源协调的"空壳") | 位于提交客户端本地 | ❌ 不可关闭 | 客户端是单点 |
| **Kubernetes Cluster** | ❌ 无 | Driver 进程自身 | 由 K8s 创建的独立 Pod | ✅ 可关闭 | Driver Pod 是单点 |
| **K8s 嵌入式 Client** | ❌ 无 | Driver 进程自身 | 在业务应用服务的 Pod 内部 | ❌ 不可关闭 | 业务应用服务是单点 |

### 3. Kubernetes 嵌入式 Client 任务提交流程详解

以典型的 **查询分析服务** 为例，当采用 K8s 嵌入式 Client 模式时，一个 Spark 作业的生命周期如下：

1. **用户请求触发**：用户通过 Web 界面或 API 发起一个查询请求。
2. **资源申请**：业务服务 Pod 内的 Driver 进程根据查询计划，向 Kubernetes API Server 请求创建特定数量的 Executor Pod。
3. **Executor 启动**：K8s 调度器根据集群资源状况，在相应节点上启动 Executor Pod。
4. **集群注册**：Executor 启动后，主动向 Driver 注册自己，汇报可用的资源（核心数、内存）。
5. **任务分发**：Driver 将计算 Job 分解为多个 Stage 和 Task，并将 Task 序列化后分发给已注册的 Executor。
6. **执行与 Shuffle**：Executor 接收并反序列化 Task，执行计算。如果涉及 Shuffle，则通过网络进行中间数据交换。
7. **结果回收与清理**：所有 Task 执行完毕后，Driver 收集最终结果并返回给业务服务。Driver 随后向 K8s 发送指令，清理本次作业启动的所有 Executor Pod，释放资源。

### 4. 关键配置参数说明

* **`spark.driver.memory`**：此参数用于设定 **临时启动的 Driver 进程** 的 JVM 堆内存大小。在 YARN Cluster、K8s Cluster 等模式下，Driver 是动态创建并独立运行的，此参数生效。而在 Client 模式下，Driver 通常作为应用进程的一部分，其内存主要由容器或 JVM 自身的 `-Xmx` 参数控制。

## 六、Spark计算模型核心概念

Spark 计算模型的核心围绕**弹性分布式数据集（RDD）**及其构建的**有向无环图（DAG）**展开。RDD 是 Spark 进行数据抽象和容错的基础，而 DAG 则定义了作业的计算逻辑与执行顺序。

### 6.1 RDD：基础数据抽象

RDD 是一个不可变、可分区、并行计算的数据集合。每一次转换操作（如 `map`、`filter`）都会生成一个新的 RDD，与父 RDD 之间存在依赖关系。

* **分区**：一个 RDD 由一个或多个分区组成，每个分区对应一个任务（Task），由 Executor 进程并行处理。分区数决定了并行度。
* **依赖与容错**：通过记录 RDD 的**血统（Lineage）**关系，Spark 能够在节点失效时重新计算丢失的分区，实现容错。

### 6.2 算子：转换与行动

算子决定了数据如何被处理。根据其是否触发作业提交，分为转换算子和行动算子。

#### 转换算子

转换是惰性操作，仅记录计算逻辑，不立即执行。

| **依赖类型** | **特征** | **典型算子** |
|---|---|---|
| **窄依赖** | 父 RDD 的每个分区最多被子 RDD 的一个分区所使用，无需 Shuffle | `map`、`filter`、`flatMap`、`union` |
| **宽依赖** | 父 RDD 的每个分区被子 RDD 的多个分区所使用，需要 Shuffle，**是划分 Stage 的边界** | `groupBy`、`reduceByKey`、`join`、`distinct`、`sortByKey` |

#### 行动算子

行动算子会触发一个完整的作业（Job）从 DAG 生成到执行。

* **典型算子**：`count()`、`collect()`、`saveAsTextFile()`、`foreach()`

### 6.3 DAG：有向无环图

DAG 是 Spark 作业（Job）的计算流程图。Spark 调度器根据 DAG，结合转换算子的依赖关系，将作业切分为一个或多个阶段（Stage）执行。

* **Stage 划分**：DAG 调度器会从后向前递归，遇到**宽依赖（Shuffle 依赖）**时就切开，形成一个新的 Stage。
* **Stage 类型**：只有 **ShuffleMapStage** 和 **ResultStage** 两种。

![](/images/hdfs-mapreduce/6.webp)

### 6.4 核心关系与执行流程

一个完整的 Spark 程序（Application）由一到多个作业（Job）组成，一个 Job 又被拆分为多个阶段（Stage），每个 Stage 包含多个任务（Task）。

* **Application**：对应一个独立运行的 Spark 程序。
* **Job**：由一个**行动算子**触发，包含该算子所需的所有转换操作形成的 DAG。
* **Stage**：Job 的执行单元。窄依赖的操作会被"融合"进同一个 Stage（称为 **Pipeline**），宽依赖是 Stage 的边界。
* **Task**：Stage 内部的任务单元，每个 Task 负责处理 RDD 的一个分区。

### 6.5 Shuffle：跨阶段数据重分布

Shuffle 是连接不同 Stage 的关键过程。当发生宽依赖操作时，数据需要跨节点重新分区和传输。

#### Spark Shuffle 优化

相比于早期 MapReduce 模型，Spark Shuffle 进行了显著优化：

1. **预聚合**：在 Map 端就对数据进行局部聚合（如 `reduceByKey` 算子），大大减少了跨网络传输的数据量，这个过程称为 **Combiner**。
2. **排序与索引**：Map Task 的输出数据会按目标分区进行排序，并生成索引文件，便于 Reduce Task 精确定位和拉取数据。

#### Shuffle 过程详解

以 `reduceByKey` 操作为例：

| **阶段** | **任务类型** | **核心工作** | **对应概念** |
|---|---|---|---|
| **上游 (Stage 1)** | **MapTask** | 1. 数据写入内存缓冲区，按键排序 2. 缓冲区满后溢出到磁盘 3. 合并临时文件，生成数据文件和索引文件 | **Shuffle Write** |
| **下游 (Stage 2)** | **ReduceTask** | 1. 通过索引文件从上游拉取属于自己的数据 2. 归并排序和聚合运算 | **Shuffle Read** |

![](/images/hdfs-mapreduce/7.webp)

![](/images/hdfs-mapreduce/8.webp)

## 七、Join 策略

### 1. Broadcast Hash Join

| **对比项** | **普通 Shuffle Join** | **广播 Join** |
|---|---|---|
| 小表副本总数 | 40 份（每个 Task 1 份） | 10 份（每个 Executor 1 份） |
| 小表占用总内存 | 40 × 100MB = 4GB | 10 × 100MB = 1GB |
| 单个 Executor 内小表占用 | 4 × 100MB = 400MB | 1 × 100MB = 100MB |
| 内存节省比例 | - | **75%** |

### 2. Shuffle Hash Join

两张表按照相同 key 重新分区，然后在每个分区内部做本地的 Hash Join。

![](/images/hdfs-mapreduce/9.png)
