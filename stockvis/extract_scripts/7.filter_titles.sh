#!/bin/bash
python ./filter_title_by_event.py ../../events/event.voc ../7.b+r.titles.dateoff.add_price.15/GSPC.dev.add_price ../7.b+r.titles.dateoff.add_price.15/GSPC.dev.add_price.filter &
python ./filter_title_by_event.py ../../events/event.voc ../7.b+r.titles.dateoff.add_price.15/GSPC.test.add_price ../7.b+r.titles.dateoff.add_price.15/GSPC.test.add_price.filter &
python ./filter_title_by_event.py ../../events/event.voc ../7.b+r.titles.dateoff.add_price.15/GSPC.train.add_price ../7.b+r.titles.dateoff.add_price.15/GSPC.train.add_price.filter &
wait
