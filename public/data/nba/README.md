# 篮途离线球员数据库

此目录由 `scripts/sync_player_database.py` 生成。游戏运行时只读取本地快照，不依赖在线接口。

- `current-players.json`：当前联盟动态模拟使用的球员基线。
- `player-index.json`：全部球员身份索引与生涯峰值引用。
- `history-*.json`：按年代拆分的球员赛季卡，历史抽取时按需加载。
- `metadata.json`：数据版本、生成日期、记录数量和来源。

属性和徽章是根据公开统计数据换算的本游戏独立数值，并非 NBA 2K 官方评分。历史缺失字段会使用同年代百分位、位置和生涯数据估算，并通过 `dataConfidence` 标记可信度。
