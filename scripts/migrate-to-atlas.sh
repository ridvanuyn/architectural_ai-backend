#!/bin/bash
# ============================================
# Local MongoDB -> Atlas Migration Script
# ============================================
#
# Kullanim:
#   1. MongoDB Atlas'ta cluster olustur (mongodb.com)
#   2. Database user olustur (username + password)
#   3. Network Access'te IP'ni ekle
#   4. Connection string'i al
#   5. Bu scripti calistir:
#
#   ./scripts/migrate-to-atlas.sh "mongodb+srv://user:pass@cluster.mongodb.net"
#

ATLAS_URI=$1
LOCAL_DB="architectural_ai_dev"
REMOTE_DB="architectural_ai"
DUMP_DIR="/tmp/architectural_ai_dump"

if [ -z "$ATLAS_URI" ]; then
  echo "Kullanim: $0 <atlas-connection-string>"
  echo "Ornek:   $0 \"mongodb+srv://user:pass@cluster.mongodb.net\""
  exit 1
fi

echo "=== Step 1: Local DB'yi dump et ==="
rm -rf $DUMP_DIR
mongodump --db $LOCAL_DB --out $DUMP_DIR
echo ""

echo "=== Step 2: Atlas'a restore et ==="
mongorestore --uri "$ATLAS_URI/$REMOTE_DB" --dir "$DUMP_DIR/$LOCAL_DB" --drop
echo ""

echo "=== Step 3: Verify ==="
mongosh "$ATLAS_URI/$REMOTE_DB" --eval "
  db.getCollectionNames().forEach(function(c) {
    print(c + ': ' + db[c].countDocuments() + ' docs');
  });
"
echo ""

echo "=== Step 4: Temizlik ==="
rm -rf $DUMP_DIR

echo ""
echo "TAMAMLANDI!"
echo ""
echo "Simdi .env dosyasinda MONGODB_URI'yi guncelle:"
echo "MONGODB_URI=$ATLAS_URI/$REMOTE_DB?retryWrites=true&w=majority"
echo ""
