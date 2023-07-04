#!/bin/zsh

git for-each-ref --format='%(refname:short)' refs/heads |
    while read branch; do
        if [ "$branch" != "main" ]
        then
            git checkout $branch
            if [ -f "Sources/config.json" ]
            then
                sed -i '' 's/stg.sdbx/prd.sdbx/g' Sources/config.json
                sed -i '' 's/dev.sdbx/prd.sdbx/g' Sources/config.json
            fi
            zip -r  ../$branch.zip ./ -x "*.git*" -x "*.DS_Store"
            git reset --hard
        fi
    done
