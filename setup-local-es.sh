#!/usr/bin/env bash
curl -XPUT 'http://localhost:9200/_template/log' -d  '
{
    "template": "logs-*",
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0
    },
    "mappings":{
        "log": {
            "_timestamp": {
                "enabled": true,
                "path" : "ts"
            },
            "dynamic_templates": [
                {
                    "doubles": {
                        "match_mapping_type": "long",
                        "mapping": {
                            "type": "double"
                        }
                    }
                }
            ]
        }
    }
}
'